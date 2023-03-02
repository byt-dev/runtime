import { CloudSpec } from "@cloudspec/aws-cdk";
import { Bucket } from "aws-cdk-lib/aws-s3";
import * as aws_dynamodb from "aws-cdk-lib/aws-dynamodb";
import { argv } from "process";

const deploy = async () => {
  const name = argv[2]
  const cloudspec = new CloudSpec(`lambda-runtime-${name}`, __dirname);
  const bucket = new Bucket(cloudspec.stack, "MyBucket");
  const table = new aws_dynamodb.Table(cloudspec.stack, "LambdaRuntimeTable", {
    partitionKey: {
      name: "PK",
      type: aws_dynamodb.AttributeType.STRING,
    },
    sortKey: {
      name: "SK",
      type: aws_dynamodb.AttributeType.STRING,
    },
    billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
  });

  const bindings = new aws_dynamodb.Table(cloudspec.stack, "Bindings", {
    partitionKey: {
      name: "PK",
      type: aws_dynamodb.AttributeType.STRING,
    },
    sortKey: {
      name: "SK",
      type: aws_dynamodb.AttributeType.STRING,
    },
    billingMode: aws_dynamodb.BillingMode.PAY_PER_REQUEST,
  });

  cloudspec.stack.outputs({
    BucketName: bucket.bucketName,
    TableName: table.tableName,
    BindingsTableName: bindings.tableName,
  });

  return await cloudspec.deploy();
};

(async () => {
  const outputs = await deploy();
  console.log(outputs);
})();