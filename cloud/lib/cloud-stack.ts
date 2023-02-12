import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaRuntime } from '../constructs/lambda-runtime'
import { UploadApi } from '../constructs/inventory'

export class CloudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new cdk.aws_s3.Bucket(this, "LambdaRuntimeBucket");
    const table = new cdk.aws_dynamodb.Table(this, "LambdaRuntimeTable", {
      partitionKey: {
        name: "id",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
    });

    const runtime = new LambdaRuntime(this, "LambdaRuntime", { bucket });
    new CfnOutput(this, "HelloHandlerArn", {
      value: runtime.handler.functionArn,
    });

    const uploadHandler = new UploadApi(this, "UploadHandler", { bucket });
  }
}
