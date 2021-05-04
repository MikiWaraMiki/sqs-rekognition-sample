import * as cdk from '@aws-cdk/core'
import { Duration } from '@aws-cdk/core'
import * as lambda from '@aws-cdk/aws-lambda'
import * as apiGateway from '@aws-cdk/aws-apigateway'
import * as cloudwatchLog from '@aws-cdk/aws-logs'
import * as awsS3 from '@aws-cdk/aws-s3'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import {
  LambdaIntegration,
  MockIntegration,
  PassthroughBehavior,
} from '@aws-cdk/aws-apigateway'
import { ENV_CONFIG } from '../.env/config'
import { BlockPublicAccess, BucketEncryption } from '@aws-cdk/aws-s3'
import { ManagedPolicy, Role, ServicePrincipal } from '@aws-cdk/aws-iam'
import { Queue } from '@aws-cdk/aws-sqs'

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // S3
    const imageBucket = new awsS3.Bucket(this, 'imageBucket', {
      bucketName: ENV_CONFIG.s3.name,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
    })

    // SQS
    const queue = new Queue(this, 'imageQueue', {
      queueName: 'rekognitionSampleQueue',
    })

    // front lambda iam role
    const frontLambdaIamRole = new Role(this, 'frontLambdaRole', {
      roleName: 'frontLambdaRole',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
      ],
    })
    // Create front Lambda
    const apiFrontLambda = new NodejsFunction(this, 'apiFront', {
      functionName: 'apiFront',
      description: 'ApiGateway and SQS and Rekognition Front',
      entry: 'src/lambda/api-front/front-cdk.ts',
      runtime: lambda.Runtime.NODEJS_12_X,
      timeout: Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      role: frontLambdaIamRole,
      environment: {
        BUCKET_NAME: imageBucket.bucketName,
        QUEUE_URL: queue.queueUrl,
      },
    })

    // API Gateway
    const restApiLogGroup = new cloudwatchLog.LogGroup(
      this,
      'restApiLogGroup',
      {
        logGroupName: '/aws/apigateway/rekognition',
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: cloudwatchLog.RetentionDays.ONE_DAY,
      },
    )
    const restApi = new apiGateway.RestApi(this, 'RestApi', {
      restApiName: 'rekognition',
      endpointTypes: [apiGateway.EndpointType.REGIONAL],
      deployOptions: {
        description: 'SQS+Rekognition front api',
        stageName: 'v1',
        accessLogDestination: new apiGateway.LogGroupLogDestination(
          restApiLogGroup,
        ),
        accessLogFormat: apiGateway.AccessLogFormat.jsonWithStandardFields(),
      },
    })
    const integration = new LambdaIntegration(apiFrontLambda)

    const postImageResource = restApi.root.addResource('image')

    // POST
    postImageResource.addMethod('POST', integration)

    // OPTIONS
    postImageResource.addMethod(
      'OPTIONS',
      new MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Headers':
                "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
              'method.response.header.Access-Control-Allow-Origin': "'*'",
              'method.response.header.Access-Control-Allow-Credentials':
                "'false'",
              'method.response.header.Access-Control-Allow-Methods':
                "'OPTIONS,GET,PUT,POST,DELETE'",
            },
          },
        ],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Headers': true,
              'method.response.header.Access-Control-Allow-Origin': true,
              'method.response.header.Access-Control-Allow-Credentials': true,
              'method.response.header.Access-Control-Allow-Methods': true,
            },
          },
        ],
      },
    )

    new lambda.CfnPermission(this, 'ApiFrontPermission', {
      principal: 'apigateway.amazonaws.com',
      action: 'lambda:InvokeFunction',
      functionName: apiFrontLambda.functionName,
      sourceArn: restApi.arnForExecuteApi(
        'POST',
        '/image',
        restApi.deploymentStage.stageName,
      ),
    })
  }
}
