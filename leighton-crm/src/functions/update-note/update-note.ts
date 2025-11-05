import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { UpdateNote } from '../../dto/update-note/update-note';
import { ResourceNotFoundError } from '../../errors/resource-not-found-error';
import { ValidationError } from '../../errors/validation-error';
import { errorHandler } from '../../shared/error-handler/error-handler';
import { logger } from '../../shared/logger/logger';
import { schemaValidator } from '../../shared/schema-validator/schema-validator';
import { schema } from './update-note-schema';

const tracer = new Tracer();
const metrics = new Metrics({
  serviceName: 'leighton-hr',
  namespace: 'leighton-hr',
});

const client = new DynamoDBClient();

export const updateNoteHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const customerId = event.pathParameters?.id;
    const noteId = event.pathParameters?.noteId;

    if (!customerId || !noteId) {
      throw new ValidationError('Customer ID and Note ID are required');
    }

    if (!event.body) throw new ValidationError('No payload');

    const body = JSON.parse(event.body) as UpdateNote;

    schemaValidator(schema, body);

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

    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};

    if (body.title) {
      updateExpressions.push('title = :title');
      expressionAttributeValues[':title'] = { S: body.title };
    }

    if (body.content) {
      updateExpressions.push('content = :content');
      expressionAttributeValues[':content'] = { S: body.content };
    }

    if (body.entityType) {
      updateExpressions.push('entityType = :entityType');
      expressionAttributeValues[':entityType'] = { S: body.entityType };
    }

    if (body.isPrivate !== undefined) {
      updateExpressions.push('isPrivate = :isPrivate');
      expressionAttributeValues[':isPrivate'] = { BOOL: body.isPrivate };
    }

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No fields to update' }),
      };
    }

    const updateCommand = new UpdateItemCommand({
      TableName: 'leighton-crm-table',
      Key: { pk, sk },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const updateResponse = await client.send(updateCommand);
    const updatedNote = updateResponse.Attributes
      ? unmarshall(updateResponse.Attributes)
      : null;

    logger.info(`Note ${noteId} updated for customer ${customerId}.`);
    metrics.addMetric('SuccessfulUpdateNote', MetricUnit.Count, 1);

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
      body: JSON.stringify({ ...updatedNote, id: noteId }),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(errorMessage);
    metrics.addMetric('UpdateNoteError', MetricUnit.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(updateNoteHandler)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(httpErrorHandler());