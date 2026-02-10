"""WebSocket default route — handle ping/subscribe messages."""

import json
import os

import boto3

dynamodb = boto3.resource("dynamodb")
TABLE = os.environ["WS_CONNECTIONS_TABLE"]


def lambda_handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    body = event.get("body", "")

    try:
        msg = json.loads(body) if body else {}
    except json.JSONDecodeError:
        msg = {}

    action = msg.get("action", "")

    if action == "ping":
        # Client keepalive — just respond
        return {"statusCode": 200, "body": json.dumps({"action": "pong"})}

    return {"statusCode": 200}
