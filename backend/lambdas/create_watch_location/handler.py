import json
import os
import re
import uuid
from datetime import datetime, timezone

import boto3

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["WATCH_LOCATIONS_TABLE"])

MAX_LOCATIONS_PER_USER = 10


def lambda_handler(event, context):
    # Extract user identity from Auth0 JWT (set by API Gateway JWT authorizer)
    claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    user_id = claims.get("sub", "")
    email = claims.get("email", "")

    if not user_id:
        return _resp(401, {"error": "Unauthorized"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _resp(400, {"error": "Invalid JSON body"})

    name = (body.get("name") or "").strip()
    lat = body.get("lat")
    lon = body.get("lon")
    radius_miles = body.get("radius_miles")

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

    if errors:
        return _resp(400, {"errors": errors})

    lat = float(lat)
    lon = float(lon)
    radius_miles = float(radius_miles)

    # Rate limit: max locations per user
    existing = table.query(
        IndexName="user-id-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("user_id").eq(user_id),
        Select="COUNT",
        FilterExpression=boto3.dynamodb.conditions.Attr("status").ne("deleted"),
    )
    if existing["Count"] >= MAX_LOCATIONS_PER_USER:
        return _resp(429, {"error": f"Maximum {MAX_LOCATIONS_PER_USER} watch locations per account"})

    location_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    table.put_item(Item={
        "location_id": location_id,
        "user_id": user_id,
        "name": name,
        "lat": str(lat),
        "lon": str(lon),
        "radius_miles": str(radius_miles),
        "email": email,
        "status": "active",
        "verified": True,
        "created_at": now,
    })

    return _resp(201, {
        "location_id": location_id,
        "message": "Watch location created and active",
    })


def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
