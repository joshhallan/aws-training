import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { CreateNote } from "../../dto/create-note/create-note";
import { randomUUID } from "node:crypto";
import { Note } from "../../dto/note/note";
import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new Error("No payload body");
    }

    const newNote = JSON.parse(event.body) as CreateNote;
    const customerId = event.pathParameters?.id;

    if (!customerId) throw new Error("No customer ID supplied");

    const id = randomUUID();
    const currentDate = new Date().toISOString();

    const newItem: Note = {
      ...newNote,
      pk: `CUSTOMER#${customerId}`,
      sk: `NOTE#${currentDate}#${id}`,
      created: currentDate,
      updated: currentDate,
      type: "NOTE",
      customerId: customerId,
      id: id,
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
      body: JSON.stringify(newNote),
    };
  } catch (error) {
    let errorMessage = "Uknown error";
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
