import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3

ddb = boto3.resource("dynamodb")
ses = boto3.client("ses")
table = ddb.Table(os.environ["WATCH_LOCATIONS_TABLE"])

ALERT_FROM_EMAIL = os.environ["ALERT_FROM_EMAIL"]
SITE_URL = os.environ["SITE_URL"]

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_LOCATIONS_PER_EMAIL = 5


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _resp(400, {"error": "Invalid JSON body"})

    name = (body.get("name") or "").strip()
    lat = body.get("lat")
    lon = body.get("lon")
    radius_miles = body.get("radius_miles")
    email = (body.get("email") or "").strip().lower()

    # Validate
    errors = []
    if not name or len(name) > 100:
        errors.append("name is required (max 100 chars)")
    if lat is None or not (-90 <= float(lat) <= 90):
        errors.append("lat must be between -90 and 90")
    if lon is None or not (-180 <= float(lon) <= 180):
        errors.append("lon must be between -180 and 180")
    if radius_miles is None or not (0 < float(radius_miles) <= 100):
        errors.append("radius_miles must be between 0 and 100")
    if not email or not EMAIL_RE.match(email):
        errors.append("valid email is required")

    if errors:
        return _resp(400, {"errors": errors})

    lat = float(lat)
    lon = float(lon)
    radius_miles = float(radius_miles)

    # Rate limit: max locations per email
    existing = table.query(
        IndexName="email-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("email").eq(email),
        Select="COUNT",
        FilterExpression=boto3.dynamodb.conditions.Attr("status").ne("deleted"),
    )
    if existing["Count"] >= MAX_LOCATIONS_PER_EMAIL:
        return _resp(429, {"error": f"Maximum {MAX_LOCATIONS_PER_EMAIL} watch locations per email"})

    location_id = str(uuid.uuid4())
    verification_token = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    table.put_item(Item={
        "location_id": location_id,
        "name": name,
        "lat": str(lat),
        "lon": str(lon),
        "radius_miles": str(radius_miles),
        "email": email,
        "status": "unverified",
        "verified": False,
        "verification_token": verification_token,
        "subscription_id": None,
        "subscription_status": "free",
        "created_at": now,
    })

    # Build API URL from the incoming request context
    domain = event.get("requestContext", {}).get("domainName", "")
    api_url = f"https://{domain}" if domain else SITE_URL

    # Send verification email
    verify_url = f"{api_url}/alerts/verify?token={verification_token}"
    ses.send_email(
        Source=ALERT_FROM_EMAIL,
        Destination={"ToAddresses": [email]},
        Message={
            "Subject": {"Data": f"Verify your watch location: {name}"},
            "Body": {
                "Html": {
                    "Data": _verification_email_html(name, lat, lon, radius_miles, verify_url)
                }
            },
        },
    )

    return _resp(201, {"location_id": location_id, "message": "Check your email to verify this watch location"})


def _verification_email_html(name, lat, lon, radius_miles, verify_url):
    return f"""<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:Arial,sans-serif;">
<div style="max-width:500px;margin:40px auto;background:#16162a;border:1px solid #2a2a4a;border-radius:12px;padding:32px;">
  <h1 style="color:#ff6b35;font-size:20px;margin:0 0 8px;">Wildfire Live Map</h1>
  <h2 style="color:#e0e0e0;font-size:16px;margin:0 0 24px;">Verify Watch Location</h2>
  <div style="background:#1a1a2e;border-radius:8px;padding:16px;margin-bottom:24px;">
    <p style="color:#aaa;margin:0 0 4px;font-size:13px;">Location: <strong style="color:#e0e0e0;">{name}</strong></p>
    <p style="color:#aaa;margin:0 0 4px;font-size:13px;">Coordinates: {lat:.4f}, {lon:.4f}</p>
    <p style="color:#aaa;margin:0;font-size:13px;">Radius: {radius_miles:.0f} miles</p>
  </div>
  <a href="{verify_url}" style="display:inline-block;background:#ff6b35;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:bold;font-size:14px;">Verify &amp; Activate</a>
  <p style="color:#666;font-size:11px;margin-top:24px;">If you didn't request this, ignore this email.</p>
</div>
</body>
</html>"""


def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
