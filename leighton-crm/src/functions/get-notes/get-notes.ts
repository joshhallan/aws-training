import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { Note } from '../../dto/note/note';
import { ValidationError } from '../../errors/validation-error';
import { errorHandler } from '../../shared/error-handler/error-handler';
import { logger } from '../../shared/logger/logger';

const tracer = new Tracer();
const metrics = new Metrics({
  serviceName: 'leighton-hr',
  namespace: 'leighton-hr',
});

const client = new DynamoDBClient();

export const getNotesHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const customerId = event.pathParameters?.id;

    if (!customerId) {
      throw new ValidationError('Customer ID is required');
    }

    // as our common access pattern is get all notes for a customer ordered by datetime, we chose this pk+sk combination to
    // optimise for this query i.e. the sk having the datetime aspect
    const queryCommand = new QueryCommand({
      TableName: 'leighton-crm-table',
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': { S: `CUSTOMER#${customerId}` },
        ':skPrefix': { S: 'NOTE#' },
      },
    });

    const response = await client.send(queryCommand);

    const notes =
      response.Items?.map((item) => unmarshall(item)) ?? ([] as Note[]);

    logger.info(`Retrieved ${notes.length} notes for customer ${customerId}.`);
    metrics.addMetric('SuccessfulGetNotes', MetricUnit.Count, 1);

    return {
      statusCode: 200,
      body: JSON.stringify(notes),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(errorMessage);
    metrics.addMetric('GetNotesError', MetricUnit.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(getNotesHandler)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(httpErrorHandler());