import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'node:path';

export class LeightonCrmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // we create the dynamodb table to store our data
    const table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: 'leighton-crm-table',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // we create the new s3 bucket for storing file objects
    const bucket = new s3.Bucket(this, 'FileBucket', {
      bucketName: 'leighton-crm-bucket',
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enforceSSL: true,
    });

    // we add a GSI to support querying all customers by type
    table.addGlobalSecondaryIndex({
      indexName: 'gsi1',
      partitionKey: {
        name: 'type',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'created',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // we create the lambda function for create customer and point it at our code
    const createCustomerLambda = new nodeLambda.NodejsFunction(
      this,
      'CreateCustomerLambda',
      {
        functionName: 'create-customer',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          '../src/functions/create-customer/create-customer.ts',
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // we create the lambda function for get a customer by ID and point it at our code
    const getCustomerLambda = new nodeLambda.NodejsFunction(
      this,
      'GetCustomerLambda',
      {
        functionName: 'get-customer',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          '../src/functions/get-customer/get-customer.ts',
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // we create the lambda function for delete a customer by ID and point it at our code
    const deleteCustomerLambda = new nodeLambda.NodejsFunction(
      this,
      'DeleteCustomerLambda',
      {
        functionName: 'delete-customer',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          '../src/functions/delete-customer/delete-customer.ts',
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // we create the lambda function for getting all customers and point it at our code
    const getAllCustomersLambda = new nodeLambda.NodejsFunction(
      this,
      'GetAllCustomersLambda',
      {
        functionName: 'get-all-customers',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          '../src/functions/get-all-customers/get-all-customers.ts',
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // we create the lambda function for creating a note for a customer by ID and point it at our code
    const createCustomerNoteLambda = new nodeLambda.NodejsFunction(
      this,
      'CreateCustomerNoteLambda',
      {
        functionName: 'create-customer-note-customer',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          '../src/functions/create-note/create-note.ts',
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    createCustomerNoteLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream', // optional
        ],
        resources: [
          `arn:aws:bedrock:eu-west-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        ],
      }),
    );

    // we create the lambda function for getting all notes for a customer by ID and point it at our code
    const getCustomerNotesLambda = new nodeLambda.NodejsFunction(
      this,
      'GetCustomerNotesLambda',
      {
        functionName: 'get-customer-notes',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, '../src/functions/get-notes/get-notes.ts'),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // we create the lambda function for getting a note for a customer by ID and point it at our code
    const getCustomerNoteLambda = new nodeLambda.NodejsFunction(
      this,
      'GetCustomerNoteLambda',
      {
        functionName: 'get-customer-note',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, '../src/functions/get-note/get-note.ts'),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // we create the lambda function for deleting a note for a customer by ID and point it at our code
    const deleteCustomerNoteLambda = new nodeLambda.NodejsFunction(
      this,
      'DeleteCustomerNoteLambda',
      {
        functionName: 'delete-customer-note',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          '../src/functions/delete-note/delete-note.ts',
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // we create the lambda function for updating a note for a customer by ID and point it at our code
    const updateCustomerNoteLambda = new nodeLambda.NodejsFunction(
      this,
      'UpdateCustomerNoteLambda',
      {
        functionName: 'update-customer-note',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          '../src/functions/update-note/update-note.ts',
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // we create the lambda function for getting a note attachment for a customer by ID and note ID, and point it at our code
    const getCustomerNoteAttachmentLambda = new nodeLambda.NodejsFunction(
      this,
      'GetCustomerNoteAttachmentLambda',
      {
        functionName: 'get-customer-note-attachment',
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          '../src/functions/get-note-attachment/get-note-attachment.ts',
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: 'handler',
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ['@aws-sdk/*'],
        },
      },
    );

    // allow the Lambda function to write to the table
    table.grantWriteData(createCustomerLambda);
    table.grantReadData(getCustomerLambda);
    table.grantWriteData(deleteCustomerLambda);
    table.grantReadData(getAllCustomersLambda);
    table.grantWriteData(createCustomerNoteLambda);
    table.grantReadData(getCustomerNotesLambda);
    table.grantReadData(getCustomerNoteLambda);
    table.grantReadWriteData(deleteCustomerNoteLambda);
    table.grantReadWriteData(updateCustomerNoteLambda);
    table.grantReadData(getCustomerNoteAttachmentLambda);

    // allow the Lambda function to put/get objects and generate presigned urls
    bucket.grantWrite(createCustomerNoteLambda);
    bucket.grantRead(getCustomerNoteAttachmentLambda);

    // add the API for communicating with our CRM system
    const api = new apigw.RestApi(this, 'Api', {
      description: 'Leighton CRM system',
      restApiName: `leighton-crm-service`,
      endpointTypes: [apigw.EndpointType.EDGE],
      deploy: true,
      deployOptions: {
        stageName: 'api',
      },
    });

    const root: apigw.Resource = api.root.addResource('v1');
    const customers: apigw.Resource = root.addResource('customers');
    const customer: apigw.Resource = customers.addResource('{id}');
    const customerNotes: apigw.Resource = customer.addResource('notes');
    const customerNote: apigw.Resource = customerNotes.addResource('{noteId}');
    const attachment: apigw.Resource = customerNote.addResource('attachment');

    // hook up the lambda function to the get request on /customers/{id}/notes{noteId}
    customerNote.addMethod(
      'GET',
      new apigw.LambdaIntegration(getCustomerNoteLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the delete request on /customers/{id}/notes{noteId}
    customerNote.addMethod(
      'DELETE',
      new apigw.LambdaIntegration(deleteCustomerNoteLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the update request on /customers/{id}/notes{noteId}
    customerNote.addMethod(
      'PATCH',
      new apigw.LambdaIntegration(updateCustomerNoteLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the get request on /customers/{id}/notes
    customerNotes.addMethod(
      'GET',
      new apigw.LambdaIntegration(getCustomerNotesLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the post request on /customers/{id}/notes
    customerNotes.addMethod(
      'POST',
      new apigw.LambdaIntegration(createCustomerNoteLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the get request on /customers/{id}/notes/{noteId}/attachment
    attachment.addMethod(
      'GET',
      new apigw.LambdaIntegration(getCustomerNoteAttachmentLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the post request on /customers
    customers.addMethod(
      'POST',
      new apigw.LambdaIntegration(createCustomerLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the get request on /customers/{id}
    customer.addMethod(
      'GET',
      new apigw.LambdaIntegration(getCustomerLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the delete request on /customers/{id}
    customer.addMethod(
      'DELETE',
      new apigw.LambdaIntegration(deleteCustomerLambda, {
        proxy: true,
      }),
    );

    // hook up the lambda function to the get request on /customers/
    customers.addMethod(
      'GET',
      new apigw.LambdaIntegration(getAllCustomersLambda, {
        proxy: true,
      }),
    );
  }
}