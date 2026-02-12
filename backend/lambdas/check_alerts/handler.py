import json
import math
import os
import time
from collections import defaultdict
from decimal import Decimal

import boto3

ddb = boto3.resource("dynamodb")
hotspots_table = ddb.Table(os.environ["HOTSPOTS_TABLE"])
watch_table = ddb.Table(os.environ["WATCH_LOCATIONS_TABLE"])
alert_table = ddb.Table(os.environ["ALERT_HISTORY_TABLE"])
ses = boto3.client("ses")

ALERT_FROM_EMAIL = os.environ["ALERT_FROM_EMAIL"]
SITE_URL = os.environ["SITE_URL"]
DEDUP_TTL_SECONDS = 48 * 3600  # 48 hours


def haversine_miles(lat1, lon1, lat2, lon2):
    R = 3958.8  # Earth radius in miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def lambda_handler(event, context):
    # Scan active watch locations
    locations = _scan_all(watch_table, FilterExpression=boto3.dynamodb.conditions.Attr("status").eq("active"))
    if not locations:
        return {"statusCode": 200, "body": "No active watch locations"}

    # Scan recent hotspots
    hotspots = _scan_all(hotspots_table)
    if not hotspots:
        return {"statusCode": 200, "body": "No hotspots"}

    now_epoch = int(time.time())
    # alerts_by_location: { location_id: [list of hotspot info dicts] }
    alerts_by_location = defaultdict(list)

    for loc in locations:
        loc_lat = float(loc["lat"])
        loc_lon = float(loc["lon"])
        radius = float(loc["radius_miles"])
        loc_id = loc["location_id"]

        for hs in hotspots:
            hs_lat = float(hs.get("latitude", 0))
            hs_lon = float(hs.get("longitude", 0))
            hs_id = hs["hotspot_id"]

            dist = haversine_miles(loc_lat, loc_lon, hs_lat, hs_lon)
            if dist > radius:
                continue

            # Dedup check
            dedup = alert_table.get_item(Key={"location_id": loc_id, "hotspot_id": hs_id})
            if "Item" in dedup:
                continue

            # Record in alert history
            alert_table.put_item(Item={
                "location_id": loc_id,
                "hotspot_id": hs_id,
                "alerted_at": now_epoch,
                "expires_at": now_epoch + DEDUP_TTL_SECONDS,
            })

            alerts_by_location[loc_id].append({
                "hotspot_id": hs_id,
                "lat": hs_lat,
                "lon": hs_lon,
                "distance_miles": round(dist, 1),
                "confidence": hs.get("confidence", "N/A"),
                "frp": str(hs.get("frp", "N/A")),
                "satellite": hs.get("satellite", "N/A"),
                "acq_date": hs.get("acq_date", ""),
                "acq_time": hs.get("acq_time", ""),
            })

    # Send one email per location
    loc_map = {loc["location_id"]: loc for loc in locations}
    sent = 0
    for loc_id, hs_list in alerts_by_location.items():
        loc = loc_map[loc_id]
        try:
            _send_alert_email(loc, hs_list)
            sent += 1
        except Exception as e:
            print(f"Failed to send alert for {loc_id}: {e}")

    return {"statusCode": 200, "body": json.dumps({"alerts_sent": sent, "hotspots_checked": len(hotspots)})}


def _send_alert_email(location, hotspot_list):
    name = location["name"]
    email = location["email"]
    count = len(hotspot_list)
    closest = min(hotspot_list, key=lambda h: h["distance_miles"])

    subject = f"Fire Alert: {count} hotspot{'s' if count != 1 else ''} detected near {name}"

    rows = ""
    for hs in sorted(hotspot_list, key=lambda h: h["distance_miles"]):
        rows += (
            f"<tr>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #2a2a4a;color:#e0e0e0;font-size:13px;'>{hs['distance_miles']} mi</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #2a2a4a;color:#e0e0e0;font-size:13px;'>{hs['confidence']}%</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #2a2a4a;color:#e0e0e0;font-size:13px;'>{hs['frp']} MW</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #2a2a4a;color:#aaa;font-size:12px;'>{hs['satellite']}</td>"
            f"</tr>"
        )

    html = f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:40px auto;background:#16162a;border:1px solid #2a2a4a;border-radius:12px;padding:32px;">
  <h1 style="color:#ff6b35;font-size:20px;margin:0 0 8px;">Wildfire Live Map</h1>
  <h2 style="color:#e0e0e0;font-size:16px;margin:0 0 20px;">Fire Activity Near {name}</h2>
  <div style="background:#1a1a2e;border-radius:8px;padding:16px;margin-bottom:20px;">
    <p style="color:#ff6b35;font-weight:bold;margin:0 0 4px;font-size:15px;">{count} new hotspot{'s' if count != 1 else ''} detected</p>
    <p style="color:#aaa;margin:0;font-size:13px;">Closest: {closest['distance_miles']} miles away</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead>
      <tr style="border-bottom:2px solid #2a2a4a;">
        <th style="padding:6px 10px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Distance</th>
        <th style="padding:6px 10px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Confidence</th>
        <th style="padding:6px 10px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">FRP</th>
        <th style="padding:6px 10px;text-align:left;color:#888;font-size:11px;text-transform:uppercase;">Satellite</th>
      </tr>
    </thead>
    <tbody>{rows}</tbody>
  </table>
  <a href="{SITE_URL}" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:10px 28px;border-radius:6px;font-weight:bold;font-size:14px;">View Live Map</a>
  <p style="color:#555;font-size:10px;margin-top:24px;line-height:1.5;">
    This is NOT an official emergency notification system. Data sourced from NASA FIRMS satellites.
    Detection may be delayed. Always follow local emergency services for evacuation guidance.
  </p>
</div>
</body>
</html>"""

    ses.send_email(
        Source=ALERT_FROM_EMAIL,
        Destination={"ToAddresses": [email]},
        Message={
            "Subject": {"Data": subject},
            "Body": {"Html": {"Data": html}},
        },
    )


def _scan_all(table, **kwargs):
    items = []
    resp = table.scan(**kwargs)
    items.extend(resp.get("Items", []))
    while "LastEvaluatedKey" in resp:
        resp = table.scan(ExclusiveStartKey=resp["LastEvaluatedKey"], **kwargs)
        items.extend(resp.get("Items", []))
    return items
