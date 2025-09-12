import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { unmarshall } from '@aws-sdk/util-dynamodb';
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

const s3 = new S3Client();
const dynamo = new DynamoDBClient();

// remember that the bucket name needs to be unique across all of AWS
const BUCKET_NAME = 'leighton-crm-bucket';

export const getNoteAttachmentHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const customerId = event.pathParameters?.id;
    const noteId = event.pathParameters?.noteId;

    if (!customerId || !noteId) {
      throw new ValidationError('Missing customerId or noteId');
    }

    // get the note from the dynamodb table so we can access the attachmentKey property
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

    const response = await dynamo.send(queryCommand);
    const note = response.Items?.[0] ? unmarshall(response.Items[0]) : null;

    if (!note || !note.attachmentKey) {
      throw new ResourceNotFoundError('Note not found or no attachment');
    }

    // create the get object command for the presigned download URL
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: note.attachmentKey,
    });

    // create the signed URL
    const downloadUrl = await getSignedUrl(s3, getCommand, { expiresIn: 300 });

    logger.info(
      `Attachment for ${noteId} retrieved for customer ${customerId}.`,
    );
    metrics.addMetric('SuccessfulGetAttachment', MetricUnit.Count, 1);

    return {
      statusCode: 200,
      body: JSON.stringify({ downloadUrl }),
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error(errorMessage);
    metrics.addMetric('GetAttachmentError', MetricUnit.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(getNoteAttachmentHandler)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(httpErrorHandler());