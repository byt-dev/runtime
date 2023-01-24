import { CloudSpec } from "https://github.com/cloudspec-dev/deno-poc/raw/main/src/cloudspec.ts";
import {
  assertEquals,
  assertObjectMatch,
  describe,
  it,
} from "https://github.com/cloudspec-dev/deno-poc/raw/main/src/testing.ts";
import { Bucket } from "npm:aws-cdk-lib@2/aws-s3";
import { LambdaRuntime } from "./lambda-runtime.ts";
import {
  PutObjectCommand,
  S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.245.0";
import {
  InvokeCommand,
  LambdaClient,
} from "https://esm.sh/@aws-sdk/client-lambda@3.245.0";
import { fromSSO } from "npm:@aws-sdk/credential-providers";

const credentials = fromSSO();
const s3 = new S3Client({ credentials, region: "eu-central-1" });
const lambda = new LambdaClient({ credentials, region: "eu-central-1" });
const cloudspec = new CloudSpec("lambda-runtime", import.meta.url);

const testApp = await cloudspec.testApp((stack) => {
  const bucket = new Bucket(stack, "MyBucket");
  const lambda = new LambdaRuntime(stack, "LambdaRuntime", { bucket });
  stack.outputs({
    BucketName: bucket.bucketName,
    LambdaArn: lambda.handler.functionArn,
  });
});

const outputs = await cloudspec.deploy(testApp);

describe("LambdaResult", () => {
  it("does not have an error", async () => {
    // put a file in the bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: outputs.BucketName,
        Key: "/lambda/index.js",
        Body: 'console.log("hello world from cloudspec!")',
      }),
    );

    // invoke the lambda
    const result = await lambda.send(
      new InvokeCommand({
        FunctionName: outputs.LambdaArn,
        Payload: new TextEncoder().encode(
          JSON.stringify({ key: "/lambda/index.js" }),
        ),
      }),
    );

    assertEquals(result.StatusCode, 200);
    assertEquals(result.FunctionError, undefined);
  });

  it("has an error", async () => {
    // put a file in the bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: outputs.BucketName,
        Key: "/lambda/index.js",
        Body:
          'console.log("hello world from cloudspec!"); throw new Error("oops")',
      }),
    );

    // invoke the lambda
    const result = await lambda.send(
      new InvokeCommand({
        FunctionName: outputs.LambdaArn,
        Payload: new TextEncoder().encode(
          JSON.stringify({ key: "/lambda/index.js" }),
        ),
      }),
    );

    assertEquals(result.StatusCode, 200);
    assertEquals(result.FunctionError, "Unhandled");
  });

  it("returns a result", async () => {
    // put a file in the bucket
    await s3.send(
      new PutObjectCommand({
        Bucket: outputs.BucketName,
        Key: "/lambda/index.js",
        Body: 'export default {hello: "world"}',
      }),
    );

    // invoke the lambda
    const result = await lambda.send(
      new InvokeCommand({
        FunctionName: outputs.LambdaArn,
        Payload: new TextEncoder().encode(
          JSON.stringify({ key: "/lambda/index.js" }),
        ),
      }),
    );

    assertEquals(result.StatusCode, 200);
    assertEquals(result.FunctionError, undefined);
    assertObjectMatch(JSON.parse(new TextDecoder().decode(result.Payload!)), {
      payload: { hello: "world" },
    });
  });
});
