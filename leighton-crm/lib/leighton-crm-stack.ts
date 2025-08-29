import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
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

    // allow the Lambda function to write to the table
    table.grantWriteData(createCustomerLambda);
    table.grantReadData(getCustomerLambda);
    table.grantWriteData(deleteCustomerLambda);
    table.grantReadData(getAllCustomersLambda);

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