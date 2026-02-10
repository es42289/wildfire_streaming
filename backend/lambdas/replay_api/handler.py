"""Replay API — list available snapshots and serve individual snapshots."""

import json
import os
from datetime import datetime, timezone, timedelta

import boto3

s3 = boto3.client("s3")

DATA_BUCKET = os.environ["DATA_BUCKET"]


def lambda_handler(event, context):
    path = event.get("rawPath", "")
    qs = event.get("queryStringParameters") or {}

    if path == "/replay/list":
        return handle_list(qs)
    elif path.startswith("/replay/snapshot/"):
        return handle_snapshot(path)
    else:
        return {"statusCode": 404, "body": json.dumps({"error": "not found"})}


def handle_list(qs):
    """List available snapshot timestamps within a time range."""
    now = datetime.now(timezone.utc)

    # Parse 'range' param: 1h, 6h, 24h, 7d (default 24h)
    range_str = qs.get("range", "24h")
    hours = parse_range(range_str)
    start = now - timedelta(hours=hours)

    # Collect snapshot keys within the range
    snapshots = []
    paginator = s3.get_paginator("list_objects_v2")
    pages = paginator.paginate(Bucket=DATA_BUCKET, Prefix="snapshots/")

    for page in pages:
        for obj in page.get("Contents", []):
            key = obj["Key"]
            ts = key_to_datetime(key)
            if ts and ts >= start:
                snapshots.append({
                    "key": key,
                    "timestamp": ts.isoformat(),
                    "date": ts.strftime("%Y-%m-%d"),
                    "hour": ts.strftime("%H"),
                })

    # Sort chronologically
    snapshots.sort(key=lambda s: s["timestamp"])

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "range": range_str,
            "count": len(snapshots),
            "snapshots": snapshots,
        }),
    }


def handle_snapshot(path):
    """Serve a specific snapshot by date/hour."""
    # Path: /replay/snapshot/YYYY-MM-DD/HH
    parts = path.split("/")
    # parts = ['', 'replay', 'snapshot', 'YYYY-MM-DD', 'HH']
    if len(parts) < 5:
        return {"statusCode": 400, "body": json.dumps({"error": "invalid path"})}

    date_str = parts[3]
    hour_str = parts[4]
    key = f"snapshots/{date_str}/{hour_str}.json"

    try:
        resp = s3.get_object(Bucket=DATA_BUCKET, Key=key)
        body = resp["Body"].read().decode("utf-8")
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": body,
        }
    except s3.exceptions.NoSuchKey:
        return {"statusCode": 404, "body": json.dumps({"error": "snapshot not found"})}


def parse_range(range_str):
    """Parse range string to hours. Supports: 1h, 6h, 24h, 3d, 7d."""
    try:
        if range_str.endswith("d"):
            return int(range_str[:-1]) * 24
        elif range_str.endswith("h"):
            return int(range_str[:-1])
    except (ValueError, IndexError):
        pass
    return 24  # default


def key_to_datetime(key):
    """Parse S3 key to datetime. Key format: snapshots/YYYY-MM-DD/HH.json"""
    parts = key.split("/")
    if len(parts) < 3:
        return None
    try:
        date_str = parts[1]
        hour_str = parts[2].replace(".json", "")
        return datetime.strptime(f"{date_str} {hour_str}", "%Y-%m-%d %H").replace(tzinfo=timezone.utc)
    except ValueError:
        return None
