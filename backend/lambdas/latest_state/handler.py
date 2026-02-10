"""Return current hotspots and incidents as GeoJSON FeatureCollections."""

import json
import os
from decimal import Decimal

import boto3

dynamodb = boto3.resource("dynamodb")
HOTSPOTS_TABLE = os.environ["HOTSPOTS_TABLE"]
INCIDENTS_TABLE = os.environ["INCIDENTS_TABLE"]


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

    result = {
        "hotspots": {
            "type": "FeatureCollection",
            "features": hotspot_features,
        },
        "incidents": {
            "type": "FeatureCollection",
            "features": incident_features,
        },
    }

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(result, cls=DecimalEncoder),
    }
