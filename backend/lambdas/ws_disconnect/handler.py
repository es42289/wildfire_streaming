"""WebSocket $disconnect handler — remove connection from DynamoDB."""

import os

import boto3

dynamodb = boto3.resource("dynamodb")
TABLE = os.environ["WS_CONNECTIONS_TABLE"]


def lambda_handler(event, context):
    connection_id = event["requestContext"]["connectionId"]
    table = dynamodb.Table(TABLE)

    table.delete_item(Key={"connection_id": connection_id})

    return {"statusCode": 200}
