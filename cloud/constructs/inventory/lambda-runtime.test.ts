import { CloudSpec } from "https://github.com/cloudspec-dev/deno-poc/raw/main/src/cloudspec.ts";
import {
  assertEquals,
  assertObjectMatch,
  describe,
  it,
} from "https://github.com/cloudspec-dev/deno-poc/raw/main/src/testing.ts";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { UploadHandler } from "./index.ts";
import {
  PutObjectCommand,
  S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.245.0";
import {
  InvokeCommand,
  LambdaClient,
} from "https://esm.sh/@aws-sdk/client-lambda@3.245.0";
import { fromSSO } from "npm:@aws-sdk/credential-providers";
import { gzip } from "https://deno.land/x/compress@v0.4.4/mod.ts";

const credentials = fromSSO();
const s3 = new S3Client({ credentials, region: "eu-central-1" });
const lambda = new LambdaClient({ credentials, region: "eu-central-1" });
const cloudspec = new CloudSpec("inventory-test", import.meta.url);

const testApp = await cloudspec.testApp((stack) => {
  const bucket = new Bucket(stack, "MyBucket");
  const table = new Table(stack, "MyTable", {
    partitionKey: { name: "id", type: AttributeType.STRING },

  });

  const lambda = new UploadHandler(stack, "UploadTest", { bucket, inventory: table });
  stack.outputs({
    BucketName: bucket.bucketName,
    Table: table.tableName,
  });
});

const outputs = await cloudspec.deploy(testApp);

describe("LambdaResult", () => {
  it("does not have an error", async () => {
    // tar and gzip the following content as a single file 'console.log("hello world from cloudspec!")'
    const body = new TextEncoder().encode('console.log("hello world from cloudspec!")');
    const gzipped = await gzip(body);

    // put a file in the bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: outputs.BucketName,
        Key: "uploads/id-1234/index.js",
        Body: gzipped,
      }),
    );
  });
});
