"""WebSocket $connect handler — store connection in DynamoDB."""

import os
import time

import boto3

dynamodb = boto3.resource("dynamodb")
TABLE = os.environ["WS_CONNECTIONS_TABLE"]
TTL_HOURS = 24


def lambda_handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    table = dynamodb.Table(TABLE)

    table.put_item(
        Item={
            "connection_id": connection_id,
            "connected_at": int(time.time()),
            "expires_at": int(time.time()) + (TTL_HOURS * 3600),
        }
    )

    return {"statusCode": 200}
