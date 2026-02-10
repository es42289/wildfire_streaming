"""Snapshot writer — reads current state from DynamoDB, writes GeoJSON to S3."""

import json
import os
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import boto3

dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

HOTSPOTS_TABLE = os.environ["HOTSPOTS_TABLE"]
INCIDENTS_TABLE = os.environ["INCIDENTS_TABLE"]
DATA_BUCKET = os.environ["DATA_BUCKET"]
RETENTION_DAYS = 7


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


def scan_all(table):
    items = []
    resp = table.scan()
    items.extend(resp.get("Items", []))
    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"])
        items.extend(resp.get("Items", []))
    return items


def lambda_handler(event, context):
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%Y-%m-%d")
    hour_str = now.strftime("%H")

    hotspots_table = dynamodb.Table(HOTSPOTS_TABLE)
    incidents_table = dynamodb.Table(INCIDENTS_TABLE)

    # Build hotspots GeoJSON
    hotspot_items = scan_all(hotspots_table)
    hotspot_features = []
    for item in hotspot_items:
        try:
            lat = float(item["latitude"])
            lon = float(item["longitude"])
        except (KeyError, ValueError, TypeError):
            continue
        hotspot_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "hotspot_id": item.get("hotspot_id", ""),
                "confidence": int(item.get("confidence", 50)),
                "frp": float(item.get("frp", 0)),
                "acq_date": item.get("acq_date", ""),
                "acq_time": item.get("acq_time", ""),
                "satellite": item.get("satellite", ""),
            },
        })

    # Build incidents GeoJSON
    incident_items = scan_all(incidents_table)
    incident_features = []
    for item in incident_items:
        if item.get("status") != "active":
            continue
        footprint_raw = item.get("footprint_geojson", "")
        if not footprint_raw:
            continue
        try:
            geometry = json.loads(footprint_raw) if isinstance(footprint_raw, str) else footprint_raw
        except (json.JSONDecodeError, TypeError):
            continue
        incident_features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "incident_id": item.get("incident_id", ""),
                "first_seen": item.get("first_seen", ""),
                "last_seen": item.get("last_seen", ""),
                "hotspot_count": int(item.get("hotspot_count", 0)),
                "hotspot_count_1h": int(item.get("hotspot_count_1h", 0)),
                "hotspot_count_6h": int(item.get("hotspot_count_6h", 0)),
                "intensity": float(item.get("intensity_max", 0)),
                "avg_confidence": float(item.get("avg_confidence", 50)),
                "centroid_lat": float(item.get("centroid_lat", 0)),
                "centroid_lon": float(item.get("centroid_lon", 0)),
            },
        })

    snapshot = {
        "timestamp": now.isoformat(),
        "hotspots": {
            "type": "FeatureCollection",
            "features": hotspot_features,
        },
        "incidents": {
            "type": "FeatureCollection",
            "features": incident_features,
        },
    }

    key = f"snapshots/{date_str}/{hour_str}.json"
    body = json.dumps(snapshot, cls=DecimalEncoder)

    s3.put_object(
        Bucket=DATA_BUCKET,
        Key=key,
        Body=body,
        ContentType="application/json",
    )

    print(f"Wrote snapshot to s3://{DATA_BUCKET}/{key} "
          f"({len(hotspot_features)} hotspots, {len(incident_features)} incidents)")

    # Prune old snapshots beyond retention
    prune_old_snapshots(now)

    return {
        "statusCode": 200,
        "body": json.dumps({
            "key": key,
            "hotspots": len(hotspot_features),
            "incidents": len(incident_features),
        }),
    }


def prune_old_snapshots(now):
    """Delete snapshot files older than RETENTION_DAYS."""
    cutoff = now - timedelta(days=RETENTION_DAYS)

    paginator = s3.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=DATA_BUCKET, Prefix="snapshots/")

    to_delete = []
    for page in pages:
        for obj in page.get("Contents", []):
            key = obj["Key"]
            # Key format: snapshots/YYYY-MM-DD/HH.json
            parts = key.split("/")
            if len(parts) < 3:
                continue
            try:
                date_str = parts[1]
                dt = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if dt < cutoff:
                    to_delete.append({"Key": key})
            except ValueError:
                continue

    if to_delete:
        # Delete in batches of 1000 (S3 limit)
        for i in range(0, len(to_delete), 1000):
            batch = to_delete[i:i + 1000]
            s3.delete_objects(
                Bucket=DATA_BUCKET,
                Delete={"Objects": batch},
            )
        print(f"Pruned {len(to_delete)} old snapshots")
