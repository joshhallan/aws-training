import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import {
  DeleteItemCommand,
  DynamoDBClient,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { ValidationError } from '../../errors/validation-error';
import { errorHandler } from '../../shared/error-handler/error-handler';
import { logger } from '../../shared/logger/logger';

const tracer = new Tracer();
const metrics = new Metrics({
  serviceName: 'leighton-hr',
  namespace: 'leighton-hr',
});

const client = new DynamoDBClient();

export const deleteNoteHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const customerId = event.pathParameters?.id;
    const noteId = event.pathParameters?.noteId;

    if (!customerId || !noteId) {
      throw new ValidationError('Customer ID and Note ID are required');
    }

    // query all notes for the customer and filter by noteId
    const queryCommand = new QueryCommand({
      TableName: 'leighton-crm-table',
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':pk': { S: `CUSTOMER#${customerId}` },
        ':skPrefix': { S: 'NOTE#' },
        ':id': { S: noteId },
      },
    });

    const response = await client.send(queryCommand);
    const noteItem = response.Items?.[0];

    if (!noteItem) {
      throw new ResourceNotFoundError('Note not found');
    }

    const { pk, sk } = noteItem;

    const deleteCommand = new DeleteItemCommand({
      TableName: 'leighton-crm-table',
      Key: { pk, sk },
    });

    await client.send(deleteCommand);

    logger.info(`Note ${noteId} deleted for customer ${customerId}.`);
    metrics.addMetric('SuccessfulDeleteNote', MetricUnit.Count, 1);

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
      body: JSON.stringify({ message: 'Note deleted successfully' }),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(errorMessage);
    metrics.addMetric('DeleteNoteError', MetricUnit.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(deleteNoteHandler)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(httpErrorHandler());