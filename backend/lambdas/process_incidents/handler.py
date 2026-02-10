"""Cluster hotspots into incidents with footprint polygons."""

import json
import os
import time
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import boto3
from botocore.exceptions import ClientError

from geo_utils import haversine_km, convex_hull, centroid, buffered_point

dynamodb = boto3.resource("dynamodb")
HOTSPOTS_TABLE = os.environ["HOTSPOTS_TABLE"]
INCIDENTS_TABLE = os.environ["INCIDENTS_TABLE"]
WS_CONNECTIONS_TABLE = os.environ.get("WS_CONNECTIONS_TABLE", "")
WS_API_ENDPOINT = os.environ.get("WS_API_ENDPOINT", "")

DISTANCE_THRESHOLD_KM = 5.0
TIME_WINDOW_HOURS = 6  # hotspots within this window are considered active
INCIDENT_ACTIVE_HOURS = 12  # incidents with no new hotspots after this are closed


def scan_all(table):
    items = []
    resp = table.scan()
    items.extend(resp.get("Items", []))
    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
        items.extend(resp.get("Items", []))
    return items


def lambda_handler(event, context):
    hotspots_table = dynamodb.Table(HOTSPOTS_TABLE)
    incidents_table = dynamodb.Table(INCIDENTS_TABLE)

    # Load all current hotspots and incidents
    hotspots = scan_all(hotspots_table)
    existing_incidents = scan_all(incidents_table)

    print(f"Loaded {len(hotspots)} hotspots, {len(existing_incidents)} incidents")

    # Build index of active incidents by id
    incidents_by_id = {}
    for inc in existing_incidents:
        if inc.get("status") == "active":
            incidents_by_id[inc["incident_id"]] = inc

    # Track which hotspots are already assigned
    assigned_hotspot_ids = set()
    for inc in incidents_by_id.values():
        for hid in inc.get("hotspot_ids", []):
            assigned_hotspot_ids.add(hid)

    # Sort hotspots by acq_datetime to process oldest first
    hotspots.sort(key=lambda h: h.get("acq_datetime", ""))

    new_assignments = 0
    new_incidents_created = 0

    for h in hotspots:
        hid = h.get("hotspot_id", "")
        if hid in assigned_hotspot_ids:
            continue

        try:
            hlat = float(h["latitude"])
            hlon = float(h["longitude"])
        except (KeyError, ValueError, TypeError):
            continue

        # Find nearest active incident within threshold
        best_inc_id = None
        best_dist = float("inf")

        for inc_id, inc in incidents_by_id.items():
            try:
                clat = float(inc["centroid_lat"])
                clon = float(inc["centroid_lon"])
            except (KeyError, ValueError, TypeError):
                continue

            dist = haversine_km(hlat, hlon, clat, clon)
            if dist < DISTANCE_THRESHOLD_KM and dist < best_dist:
                best_dist = dist
                best_inc_id = inc_id

        if best_inc_id:
            # Attach to existing incident
            inc = incidents_by_id[best_inc_id]
            if "hotspot_ids" not in inc:
                inc["hotspot_ids"] = []
            inc["hotspot_ids"].append(hid)
            inc["_dirty"] = True
            assigned_hotspot_ids.add(hid)
            new_assignments += 1
        else:
            # Create new incident
            inc_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
            incidents_by_id[inc_id] = {
                "incident_id": inc_id,
                "status": "active",
                "first_seen": h.get("acq_datetime", ""),
                "centroid_lat": str(hlat),
                "centroid_lon": str(hlon),
                "hotspot_ids": [hid],
                "_dirty": True,
            }
            assigned_hotspot_ids.add(hid)
            new_incidents_created += 1

    # Now recompute metrics and geometry for dirty incidents
    # Build a lookup from hotspot_id to hotspot
    hs_by_id = {h["hotspot_id"]: h for h in hotspots}
    now = datetime.now(timezone.utc)

    updated_incidents = []
    for inc_id, inc in incidents_by_id.items():
        if not inc.get("_dirty"):
            continue

        hids = inc.get("hotspot_ids", [])
        points = []
        frp_values = []
        confidence_values = []
        latest_acq = ""
        count_1h = 0
        count_6h = 0

        for hid in hids:
            hs = hs_by_id.get(hid)
            if not hs:
                continue
            try:
                lat = float(hs["latitude"])
                lon = float(hs["longitude"])
            except (KeyError, ValueError, TypeError):
                continue

            points.append((lon, lat))

            try:
                frp_values.append(float(hs.get("frp", 0)))
            except (ValueError, TypeError):
                pass
            try:
                confidence_values.append(int(hs.get("confidence", 50)))
            except (ValueError, TypeError):
                pass

            acq = hs.get("acq_datetime", "")
            if acq > latest_acq:
                latest_acq = acq

            # Approximate time-based counts
            acq_date = hs.get("acq_date", "")
            acq_time = hs.get("acq_time", "0000")
            try:
                hs_dt = datetime(
                    int(acq_date[:4]), int(acq_date[5:7]), int(acq_date[8:10]),
                    int(acq_time[:2]), int(acq_time[2:4]),
                    tzinfo=timezone.utc,
                )
                age = now - hs_dt
                if age < timedelta(hours=1):
                    count_1h += 1
                if age < timedelta(hours=6):
                    count_6h += 1
            except (ValueError, IndexError):
                pass

        if not points:
            continue

        # Compute footprint
        if len(points) == 1:
            footprint_coords = buffered_point(points[0][0], points[0][1])
        elif len(points) == 2:
            # Buffer around line
            mid_lon = (points[0][0] + points[1][0]) / 2
            mid_lat = (points[0][1] + points[1][1]) / 2
            footprint_coords = buffered_point(mid_lon, mid_lat, radius_km=3.0)
        else:
            footprint_coords = convex_hull(points)

        cent = centroid(points)

        # Build GeoJSON polygon
        footprint_geojson = {
            "type": "Polygon",
            "coordinates": [footprint_coords],
        }

        intensity = max(frp_values) if frp_values else 0.0
        avg_confidence = (
            sum(confidence_values) / len(confidence_values)
            if confidence_values
            else 50
        )

        item = {
            "incident_id": inc_id,
            "status": "active",
            "first_seen": inc.get("first_seen", ""),
            "last_seen": latest_acq,
            "hotspot_count": len(hids),
            "hotspot_count_1h": count_1h,
            "hotspot_count_6h": count_6h,
            "centroid_lat": str(cent[1]),
            "centroid_lon": str(cent[0]),
            "intensity_max": Decimal(str(round(intensity, 2))),
            "avg_confidence": Decimal(str(round(avg_confidence, 1))),
            "footprint_geojson": json.dumps(footprint_geojson),
            "hotspot_ids": hids,
            "updated_at": now.isoformat(),
        }
        updated_incidents.append(item)

    # Write updated incidents
    with incidents_table.batch_writer() as batch:
        for item in updated_incidents:
            batch.put_item(Item=item)

    print(
        f"Done: {new_assignments} assigned, {new_incidents_created} new incidents, "
        f"{len(updated_incidents)} updated"
    )

    # Broadcast to WebSocket clients
    if updated_incidents and WS_CONNECTIONS_TABLE and WS_API_ENDPOINT:
        broadcast_update(updated_incidents)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "new_assignments": new_assignments,
            "new_incidents": new_incidents_created,
            "updated": len(updated_incidents),
        }),
    }


def broadcast_update(updated_incidents):
    """Push incident updates to all connected WebSocket clients."""
    if not WS_CONNECTIONS_TABLE or not WS_API_ENDPOINT:
        return

    ws_table = dynamodb.Table(WS_CONNECTIONS_TABLE)
    apigw = boto3.client(
        "apigatewaymanagementapi",
        endpoint_url=WS_API_ENDPOINT,
    )

    # Build a lightweight update payload
    incident_summaries = []
    for item in updated_incidents:
        incident_summaries.append({
            "incident_id": item["incident_id"],
            "hotspot_count": item["hotspot_count"],
            "intensity_max": float(item["intensity_max"]),
            "centroid_lat": float(item["centroid_lat"]),
            "centroid_lon": float(item["centroid_lon"]),
            "footprint_geojson": item["footprint_geojson"],
        })

    payload = json.dumps({
        "action": "incidents_updated",
        "incidents": incident_summaries,
    }).encode("utf-8")

    # Get all connections
    connections = []
    resp = ws_table.scan(ProjectionExpression="connection_id")
    connections.extend(resp.get("Items", []))
    while "LastEvaluatedKey" in resp:
        resp = ws_table.scan(
            ProjectionExpression="connection_id",
            ExclusiveStartKey=resp["LastEvaluatedKey"],
        )
        connections.extend(resp.get("Items", []))

    stale = []
    for conn in connections:
        cid = conn["connection_id"]
        try:
            apigw.post_to_connection(ConnectionId=cid, Data=payload)
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("GoneException", "410"):
                stale.append(cid)
            else:
                print(f"Failed to send to {cid}: {e}")

    # Clean up stale connections
    for cid in stale:
        ws_table.delete_item(Key={"connection_id": cid})

    print(f"Broadcast to {len(connections)} clients ({len(stale)} stale removed)")
