import json
import os
from datetime import datetime, timezone

import boto3

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["WATCH_LOCATIONS_TABLE"])
SITE_URL = os.environ["SITE_URL"]


def lambda_handler(event, context):
    qs = event.get("queryStringParameters") or {}
    token = qs.get("token", "").strip()

    if not token:
        return _html_resp(400, "Missing Token", "No verification token provided.")

    # Look up location by token
    result = table.query(
        IndexName="token-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("verification_token").eq(token),
    )

    if not result["Items"]:
        return _html_resp(404, "Invalid Token", "This verification link is invalid or has expired.")

    location_id = result["Items"][0]["location_id"]

    # Fetch full item
    item = table.get_item(Key={"location_id": location_id}).get("Item")
    if not item:
        return _html_resp(404, "Not Found", "Watch location not found.")

    if item.get("status") == "deleted":
        return _html_resp(410, "Deleted", "This watch location has been removed.")

    if item.get("verified"):
        return _html_resp(200, "Already Verified",
                          f"<strong>{item['name']}</strong> is already active. You'll receive alerts when hotspots appear within range.")

    # Activate
    now = datetime.now(timezone.utc).isoformat()
    table.update_item(
        Key={"location_id": location_id},
        UpdateExpression="SET verified = :v, #s = :s, verified_at = :t",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":v": True, ":s": "active", ":t": now},
    )

    return _html_resp(200, "Verified!",
                      f"<strong>{item['name']}</strong> is now active. "
                      f"You'll receive email alerts when satellite-detected hotspots appear within {item['radius_miles']} miles.")


def _html_resp(status, title, message):
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} — Wildfire Live Map</title></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
<div style="max-width:480px;background:#16162a;border:1px solid #2a2a4a;border-radius:12px;padding:40px;text-align:center;">
  <h1 style="color:#ff6b35;font-size:20px;margin:0 0 12px;">Wildfire Live Map</h1>
  <h2 style="color:#e0e0e0;font-size:18px;margin:0 0 16px;">{title}</h2>
  <p style="color:#aaa;font-size:14px;line-height:1.6;margin:0 0 24px;">{message}</p>
  <a href="{SITE_URL}" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:10px 28px;border-radius:6px;font-weight:bold;font-size:14px;">Open Live Map</a>
</div>
</body>
</html>"""
    return {
        "statusCode": status,
        "headers": {"Content-Type": "text/html"},
        "body": html,
    }
