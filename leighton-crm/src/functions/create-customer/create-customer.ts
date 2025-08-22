import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { CreateCustomer } from "../../dto/create-customer/create-customer";
import { Customer } from "../../dto/customer/customer";

const client = new DynamoDBClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new Error("No payload body");
    }

    const newCustomer = JSON.parse(event.body) as CreateCustomer;

    const id = randomUUID;
    const currentDate = new Date().toISOString();

    const newItem: Customer = {
      ...newCustomer,
      pk: `CUSTOMER#${id}`,
      sk: `CUSTOMER#${id}`,
      created: currentDate,
      updated: currentDate,
      type: "CUSTOMER",
    };

    const putCommand = new PutItemCommand({
      TableName: "leighton-crm-table",
      Item: marshall(newItem, {
        removeUndefinedValues: true,
      }),
    });

    await client.send(putCommand);

    return {
      statusCode: 200,
      body: JSON.stringify(newCustomer),
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
