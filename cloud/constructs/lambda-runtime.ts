import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { join, fromFileUrl, dirname } from "https://deno.land/std@0.171.0/path/mod.ts";

export interface LambdaRuntimeProps {
  bucket: cdk.aws_s3.IBucket;
}

export class LambdaRuntime extends Construct {
  public readonly handler: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaRuntimeProps) {
    super(scope, id);

    const { bucket } = props;

    this.handler = new lambda.Function(this, "HelloHandler", {
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
        BUCKET_NAME: bucket.bucketName,
      },
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    bucket.grantRead(this.handler);
  }
}
