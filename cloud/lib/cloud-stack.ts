import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { join, fromFileUrl, dirname } from 'https://deno.land/std/path/mod.ts';

export class CloudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new lambda.Function(this, "HelloHandler", {
      description:
        "Deploying a Rust function on Lambda using the custom runtime",
      code: lambda.Code.fromAsset(
        join(dirname(fromFileUrl(import.meta.url)), "rust-runtime/target/lambda/release/bootstrap.zip"),
      ),
      runtime: lambda.Runtime.PROVIDED_AL2,
      timeout: cdk.Duration.seconds(30),
      memorySize: 2048,
      handler: "not.required",
      environment: {
        RUST_BACKTRACE: "1",
      },
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    new CfnOutput(this, "HelloHandlerArn", {
      value: handler.functionArn,
    });
  }
}
