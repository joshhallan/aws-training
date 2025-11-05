import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { MetricUnit, Metrics } from "@aws-lambda-powertools/metrics";
import { logMetrics } from "@aws-lambda-powertools/metrics/middleware";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer/middleware";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import middy from "@middy/core";
import httpErrorHandler from "@middy/http-error-handler";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { CreateCustomer } from "../../dto/create-customer/create-customer";
import { Customer } from "../../dto/customer/customer";
import { ValidationError } from "../../errors/validation-error";
import { errorHandler } from "../../shared/error-handler/error-handler";
import { logger } from "../../shared/logger/logger";
import { schemaValidator } from "../../shared/schema-validator/schema-validator";
import { schema } from "./create-customer-schema";

const tracer = new Tracer();
const metrics = new Metrics({
  serviceName: "leighton-hr",
  namespace: "leighton-hr",
});

const client = new DynamoDBClient();

export const createCustomerHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new ValidationError("No payload body");
    }

    const newCustomer = JSON.parse(event.body) as CreateCustomer;

    schemaValidator(schema, newCustomer);

    const id = randomUUID();
    const currentDate = new Date().toISOString();

    const newItem: Customer = {
      ...newCustomer,
      pk: `CUSTOMER#${id}`,
      sk: `CUSTOMER#${id}`,
      created: currentDate,
      updated: currentDate,
      type: "CUSTOMER",
      customerId: id,
    };

    const putCommand = new PutItemCommand({
      TableName: "leighton-crm-table",
      Item: marshall(newItem, {
        removeUndefinedValues: true,
      }),
    });

    await client.send(putCommand);

    logger.info(`Customer ${newCustomer.customerId} created.`);

    metrics.addMetric("SuccessfulCreateCustomer", MetricUnit.Count, 1);

    const ALLOW_ORIGIN = "*";

    const baseHeaders = {
      "Access-Control-Allow-Origin": ALLOW_ORIGIN,
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "OPTIONS,POST",
      "Content-Type": "application/json",
    };

    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify(newCustomer),
    };
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof Error) errorMessage = error.message;
    logger.error(errorMessage);

    metrics.addMetric("CreateCustomerError", MetricUnit.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(createCustomerHandler)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(httpErrorHandler());
