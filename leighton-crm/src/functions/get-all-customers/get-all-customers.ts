import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Customer } from "../../dto/customer/customer";

const client = new DynamoDBClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // we will look at pagination, filtering etc in a different module
    const queryCommand = new QueryCommand({
      TableName: "leighton-crm-table",
      IndexName: "gsi1",
      KeyConditionExpression: "#type = :typeVal",
      ExpressionAttributeNames: {
        "#type": "type",
      },
      ExpressionAttributeValues: {
        ":typeVal": { S: "CUSTOMER" },
      },
      ScanIndexForward: false, // we want to ensure we get the newest customers first
    });

    const response = await client.send(queryCommand);

    const customers =
      response.Items?.map((item) => unmarshall(item) as Customer) || [];

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      },
      body: JSON.stringify(customers),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to query customers by type" }),
    };
  }
};
