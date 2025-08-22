import * as cdk from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "node:path";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class LeightonCrmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // We create a dynamoDB table to store our data
    const table = new dynamodb.Table(this, "Table", {
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "sk",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: "leighton-crm-table",
    });

    // We create the lambda function for create customer and point it at our code
    const createCustomerLambda = new nodeLambda.NodejsFunction(
      this,
      "CreateCustomerLambda",
      {
        functionName: "create-customer",
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(
          __dirname,
          "../src/functions/create-customer/create-customer.ts"
        ),
        logRetention: logs.RetentionDays.ONE_DAY,
        handler: "handler",
        memorySize: 1024,
        architecture: lambda.Architecture.ARM_64,
        tracing: lambda.Tracing.ACTIVE,
        timeout: cdk.Duration.seconds(5),
        bundling: {
          minify: true,
          externalModules: ["@aws-sdk/*"],
        },
      }
    );

    // allow the Lambda function to write to the table
    table.grantWriteData(createCustomerLambda);

    // Add the API for communicating with our CRM system
    const api = new apigw.RestApi(this, "API", {
      description: "Leighton CRM system",
      restApiName: "Leighton-crm-service",
      endpointTypes: [apigw.EndpointType.EDGE],
      deploy: true,
      deployOptions: {
        stageName: "api",
      },
    });

    const root: apigw.Resource = api.root.addResource("v1");
    const customers: apigw.Resource = root.addResource("customers");

    customers.addMethod(
      "POST",
      new apigw.LambdaIntegration(createCustomerLambda, {
        proxy: true,
      })
    );
  }
}
