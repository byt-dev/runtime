import { CloudSpec } from "@cloudspec/aws-cdk";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { LambdaRuntime } from "./lambda-runtime";
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  InvokeCommand,
  LambdaClient,
} from "@aws-sdk/client-lambda";

const deploy = async () => {
  const cloudspec = new CloudSpec("lambda-runtime", __dirname);
  const bucket = new Bucket(cloudspec.stack, "MyBucket");
  const lambdaRuntime = new LambdaRuntime(cloudspec.stack, "LambdaRuntime", { bucket });
  cloudspec.stack.outputs({
    BucketName: bucket.bucketName,
    LambdaArn: lambdaRuntime.handler.functionArn,
  });
  return await cloudspec.deploy();
};

const s3 = new S3Client({});
const lambda = new LambdaClient({});

describe("LambdaResult", () => {
  let outputs: any;

  beforeAll(async () => {
    outputs = await deploy();
  }, 600_000);

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

    expect(result.StatusCode).toEqual(200);
    expect(result.FunctionError).toEqual(undefined);
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

    expect(result.StatusCode).toEqual(200);
    expect(result.FunctionError).toEqual("Unhandled");
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

    expect(result.StatusCode).toEqual(200);
    expect(result.FunctionError).toEqual(undefined);
    expect(JSON.parse(new TextDecoder().decode(result.Payload!))).toMatchObject({
      payload: { hello: "world" },
    });
  });
});
