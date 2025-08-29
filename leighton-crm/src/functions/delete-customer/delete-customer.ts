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
        pk: { S: `CUSTOMERS#${customerId}` },
        sk: { S: `CUSTOMERS#${customerId}` },
      },
    });

    await client.send(deleteCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Customer ${customerId} deleted successfully`,
      }),
    };
  } catch (error) {
    let errorMessage = "Unnown error";
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
