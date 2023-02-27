import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from 'path'
export interface LambdaRuntimeProps {
  bucket: cdk.aws_s3.IBucket;
  table: cdk.aws_dynamodb.ITable;
}
export class LambdaRuntime extends Construct {
  public readonly handler: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaRuntimeProps) {
    super(scope, id);

    const { bucket, table } = props;

    this.handler = new lambda.Function(this, "HelloHandler", {
      description:
        "Deploying a Rust function on Lambda using the custom runtime",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "rust-runtime/target/lambda/release/bootstrap.zip"),
      ),
      runtime: lambda.Runtime.PROVIDED_AL2,
      timeout: cdk.Duration.seconds(30),
      memorySize: 2048,
      handler: "not.required",
      environment: {
        RUST_BACKTRACE: "1",
        BUCKET_NAME: bucket.bucketName,
        TABLE_NAME: table.tableName,
      },
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    bucket.grantRead(this.handler);
    table.grantReadWriteData(this.handler);
  }
}
