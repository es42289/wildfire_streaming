import json
import os
from decimal import Decimal

import boto3

ddb = boto3.resource("dynamodb")
watch_table = ddb.Table(os.environ["WATCH_LOCATIONS_TABLE"])
alert_table = ddb.Table(os.environ["ALERT_HISTORY_TABLE"])


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)


def lambda_handler(event, context):
    claims = event.get("requestContext", {}).get("authorizer", {}).get("jwt", {}).get("claims", {})
    user_id = claims.get("sub", "")

    if not user_id:
        return _resp(401, {"error": "Unauthorized"})

    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    location_id = event.get("pathParameters", {}).get("location_id", "")

    if not location_id:
        return _resp(400, {"error": "location_id is required"})

    if method == "GET":
        return _get_location(location_id, user_id)
    elif method == "DELETE":
        return _delete_location(location_id, user_id)
    else:
        return _resp(405, {"error": "Method not allowed"})


def _get_location(location_id, user_id):
    result = watch_table.get_item(Key={"location_id": location_id})
    item = result.get("Item")
    if not item or item.get("status") == "deleted":
        return _resp(404, {"error": "Watch location not found"})

    if item.get("user_id") != user_id:
        return _resp(403, {"error": "Access denied"})

    # Fetch recent alert history
    alerts_resp = alert_table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("location_id").eq(location_id),
        ScanIndexForward=False,
        Limit=20,
    )

    return _resp(200, {
        "location": item,
        "recent_alerts": alerts_resp.get("Items", []),
    })


def _delete_location(location_id, user_id):
    result = watch_table.get_item(Key={"location_id": location_id})
    item = result.get("Item")
    if not item:
        return _resp(404, {"error": "Watch location not found"})

    if item.get("user_id") != user_id:
        return _resp(403, {"error": "Access denied"})

    watch_table.update_item(
        Key={"location_id": location_id},
        UpdateExpression="SET #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": "deleted"},
    )

    return _resp(200, {"message": "Watch location deactivated"})


def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, cls=DecimalEncoder),
    }
