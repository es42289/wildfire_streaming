"""Ingest hotspots from NASA FIRMS feeds (multiple sources) into DynamoDB."""

import csv
import io
import json
import os
import time
from datetime import datetime, timezone
from urllib.request import urlopen, Request
from urllib.error import URLError

import boto3

ssm = boto3.client("ssm")
dynamodb = boto3.resource("dynamodb")

HOTSPOTS_TABLE = os.environ["HOTSPOTS_TABLE"]
CURSORS_TABLE = os.environ["CURSORS_TABLE"]
FIRMS_API_KEY_PARAM = os.environ["FIRMS_API_KEY_PARAM"]

# CONUS bounding box
WEST, SOUTH, EAST, NORTH = -125, 24, -66, 50
CURSOR_NAME = "FIRMS_ALL"
TTL_HOURS = 24

# Fetch from multiple sources to maximize coverage
FIRMS_SOURCES = [
    "MODIS_NRT",
    "VIIRS_SNPP_NRT",
    "VIIRS_NOAA20_NRT",
    "VIIRS_NOAA21_NRT",
]


def get_api_key():
    resp = ssm.get_parameter(Name=FIRMS_API_KEY_PARAM, WithDecryption=True)
    return resp["Parameter"]["Value"]


def get_cursor(table):
    resp = table.get_item(Key={"source_name": CURSOR_NAME})
    item = resp.get("Item")
    if item:
        return item.get("last_acq_datetime", "")
    return ""


def set_cursor(table, acq_datetime):
    table.put_item(
        Item={
            "source_name": CURSOR_NAME,
            "last_acq_datetime": acq_datetime,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )


def fetch_firms_csv(api_key, source):
    url = (
        f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{api_key}/{source}/{WEST},{SOUTH},{EAST},{NORTH}/1"
    )
    req = Request(url, headers={"User-Agent": "wildfire-live-map/1.0"})
    try:
        with urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8")
    except (URLError, TimeoutError) as e:
        print(f"Failed to fetch {source}: {e}")
        return ""


def parse_hotspots(csv_text, source_name, cursor_datetime):
    if not csv_text.strip():
        return [], cursor_datetime

    reader = csv.DictReader(io.StringIO(csv_text))
    hotspots = []
    max_acq = cursor_datetime

    for row in reader:
        acq_date = row.get("acq_date", "")
        acq_time = row.get("acq_time", "").zfill(4)
        acq_datetime = f"{acq_date} {acq_time}"

        # Skip rows we've already ingested
        if cursor_datetime and acq_datetime <= cursor_datetime:
            continue

        lat = row.get("latitude", "")
        lon = row.get("longitude", "")
        if not lat or not lon:
            continue

        satellite = row.get("satellite", "")
        hotspot_id = f"{source_name}_{acq_date}_{acq_time}_{lat}_{lon}"

        confidence = row.get("confidence", "")
        try:
            confidence_val = int(confidence) if confidence not in ("l", "n", "h", "") else (
                {"l": 20, "n": 50, "h": 85}.get(confidence, 50)
            )
        except ValueError:
            confidence_val = 50

        frp = row.get("frp", "0")
        try:
            frp_val = float(frp)
        except (ValueError, TypeError):
            frp_val = 0.0

        # MODIS uses "brightness", VIIRS uses "bright_ti4"
        brightness = row.get("bright_ti4") or row.get("brightness", "")

        now_ts = int(time.time())
        expires_at = now_ts + (TTL_HOURS * 3600)

        hotspots.append(
            {
                "hotspot_id": hotspot_id,
                "latitude": lat,
                "longitude": lon,
                "acq_date": acq_date,
                "acq_time": acq_time,
                "acq_datetime": acq_datetime,
                "confidence": confidence_val,
                "frp": str(frp_val),
                "satellite": satellite,
                "brightness": brightness,
                "source": source_name,
                "ingested_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": expires_at,
            }
        )

        if acq_datetime > max_acq:
            max_acq = acq_datetime

    return hotspots, max_acq


def lambda_handler(event, context):
    api_key = get_api_key()

    cursors_table = dynamodb.Table(CURSORS_TABLE)
    hotspots_table = dynamodb.Table(HOTSPOTS_TABLE)

    cursor = get_cursor(cursors_table)
    print(f"Current cursor: '{cursor}'")

    all_hotspots = []
    global_max_acq = cursor

    for source in FIRMS_SOURCES:
        csv_text = fetch_firms_csv(api_key, source)
        hotspots, max_acq = parse_hotspots(csv_text, source, cursor)
        print(f"  {source}: {len(hotspots)} new hotspots")
        all_hotspots.extend(hotspots)
        if max_acq > global_max_acq:
            global_max_acq = max_acq

    print(f"Total: {len(all_hotspots)} new hotspots (max_acq={global_max_acq})")

    if not all_hotspots:
        return {"statusCode": 200, "body": json.dumps({"ingested": 0})}

    # Batch write to DynamoDB (25 items per batch)
    with hotspots_table.batch_writer() as batch:
        for h in all_hotspots:
            batch.put_item(Item=h)

    set_cursor(cursors_table, global_max_acq)
    print(f"Updated cursor to '{global_max_acq}', wrote {len(all_hotspots)} items")

    return {"statusCode": 200, "body": json.dumps({"ingested": len(all_hotspots)})}
