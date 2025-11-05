import { DeleteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const client = new DynamoDBClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const customerId = event.pathParameters?.id;

    if (!customerId) {
      throw new Error("Customer ID is required");
    }

    const deleteCommand = new DeleteItemCommand({
      TableName: "leighton-crm-table",
      Key: {
        pk: { S: `CUSTOMER#${customerId}` },
        sk: { S: `CUSTOMER#${customerId}` },
      },
    });

    await client.send(deleteCommand);

    const ALLOW_ORIGIN = "*";

    const baseHeaders = {
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "OPTIONS, GET, POST, PUT, DELETE, PATCH",
      "Content-Type": "application/json",
    };

    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify({
        message: `Customer ${customerId} deleted successfully`,
      }),
    };
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.log(error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage }),
    };
  }
};
