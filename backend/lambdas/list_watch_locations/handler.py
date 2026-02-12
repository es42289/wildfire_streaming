import json
import os
from decimal import Decimal

import boto3

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["WATCH_LOCATIONS_TABLE"])


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

    result = table.query(
        IndexName="user-id-index",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("user_id").eq(user_id),
        FilterExpression=boto3.dynamodb.conditions.Attr("status").ne("deleted"),
    )

    return _resp(200, {"locations": result.get("Items", [])})


def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, cls=DecimalEncoder),
    }
