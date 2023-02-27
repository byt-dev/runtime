import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaRuntime } from '../constructs/lambda-runtime'
import { UploadApi } from '../constructs/inventory'
import { Identity } from '../constructs/identity'
import { Api } from '../constructs/api'

export class CloudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new cdk.aws_s3.Bucket(this, "LambdaRuntimeBucket");
    const table = new cdk.aws_dynamodb.Table(this, "LambdaRuntimeTable", {
      partitionKey: {
        name: "PK",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
    });

    const identity = new Identity(this, "Identity", {})

    const runtime = new LambdaRuntime(this, "LambdaRuntime", { bucket, table });
    const api = new Api(this, "Api", { lambda: runtime.handler });

    const uploadHandler = new UploadApi(this, "UploadHandler", { bucket, cognito: {
      userPoolId: identity.userPool.userPoolId,
      clientId: identity.client.userPoolClientId,
      domain: identity.domain.domainName,
      region: cdk.Stack.of(this).region,
    }});

    new CfnOutput(this, "UploadHandlerArn", {
      value: uploadHandler.distribution.distributionDomainName,
    });

    new CfnOutput(this, "ClientId", {
      value: identity.client.userPoolClientId,
    });

    new CfnOutput(this, "UserPoolId", {
      value: identity.userPool.userPoolId,
    });

    new CfnOutput(this, "UserPoolDomain", {
      value: identity.domain.domainName,
    });

    new CfnOutput(this, "ApiDomain", {
      value: api.domain.domainName,
    });
  }
}
