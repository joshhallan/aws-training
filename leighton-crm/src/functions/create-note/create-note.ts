import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { MetricUnit, Metrics } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'node:crypto';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateNote } from '../../dto/create-note/create-note';
import { Note } from '../../dto/note/note';
import { ValidationError } from '../../errors/validation-error';
import { errorHandler } from '../../shared/error-handler/error-handler';
import { logger } from '../../shared/logger/logger';
import { schemaValidator } from '../../shared/schema-validator/schema-validator';
import { schema } from './create-note-schema';

// remember that the bucket name needs to be unique across all of AWS
const BUCKET_NAME = 'leighton-crm-bucket-ja';

const tracer = new Tracer();
const metrics = new Metrics({
  serviceName: 'leighton-hr',
  namespace: 'leighton-hr',
});

const s3 = new S3Client();
const client = new DynamoDBClient();

export const createNoteHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      throw new ValidationError('No payload body');
    }

    const newNote = JSON.parse(event.body) as CreateNote;
    const customerId = event.pathParameters?.id;

    if (!customerId) throw new Error('No customer ID supplied');

    schemaValidator(schema, newNote);

    let attachmentKey: string | undefined;
    let uploadUrl: string | undefined;

    const id = randomUUID();
    const currentDate = new Date().toISOString();

    // if a filename property exists, we know the consumer wants to upload a file
    if (newNote.filename) {
      attachmentKey = `notes/${customerId}/attachments/${id}/${newNote.filename}`;
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: attachmentKey,
        ContentType: 'application/octet-stream',
      });

      // we allow the upload URL to be used for 5 minutes
      uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    }

    const newItem: Note = {
      ...newNote,
      pk: `CUSTOMER#${customerId}`,
      sk: `NOTE#${currentDate}#${id}`,
      created: currentDate,
      updated: currentDate,
      type: 'NOTE',
      customerId: customerId,
      id: id,
      attachmentKey: attachmentKey, // we save the key for where the document lives in S3
    };

    const putCommand = new PutItemCommand({
      TableName: 'leighton-crm-table',
      Item: marshall(newItem, {
        removeUndefinedValues: true,
      }),
    });

    await client.send(putCommand);

    logger.info(`Note ${id} created for customer ${customerId}.`);

    metrics.addMetric('SuccessfulCreateNote', MetricUnit.Count, 1);

    return {
      statusCode: 200,
      body: JSON.stringify({ ...newNote, id, uploadUrl }), // we return the upload url in the response
    };
  } catch (error) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) errorMessage = error.message;

    logger.error(errorMessage);
    metrics.addMetric('CreateNoteError', MetricUnit.Count, 1);

    return errorHandler(error);
  }
};

export const handler = middy(createNoteHandler)
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(httpErrorHandler());