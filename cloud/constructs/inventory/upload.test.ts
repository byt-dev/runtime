import { CloudSpec } from "https://github.com/cloudspec-dev/deno-poc/raw/main/src/cloudspec.ts";
import {
  describe,
  it,
} from "https://github.com/cloudspec-dev/deno-poc/raw/main/src/testing.ts";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { UploadApi } from "./upload.ts";
import {
  S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.245.0";
import { fromSSO } from "npm:@aws-sdk/credential-providers";
import { gzip } from "https://deno.land/x/compress@v0.4.4/mod.ts";

const credentials = fromSSO();
const s3 = new S3Client({ credentials, region: "eu-central-1" });
const cloudspec = new CloudSpec("upload-test", import.meta.url);

const testApp = await cloudspec.testApp((stack) => {
  const bucket = new Bucket(stack, "MyBucket");

  const upload = new UploadApi(stack, "UploadTest", { bucket });
  stack.outputs({
    BucketName: bucket.bucketName,
    Url: upload.distribution.distributionDomainName,
  });
});

const outputs = await cloudspec.deploy(testApp);

describe("UploadAPI", () => {
  it("uploads successfully", async () => {
    // tar and gzip the following content as a single file 'console.log("hello world from cloudspec!")'
    const body = new TextEncoder().encode('console.log("hello world from cloudspec!")');
    const gzipped = await gzip(body);

    const url = outputs.Url;

    // upload gzipped file to the url
    fetch(url, {
      method: "PUT",
      body: gzipped,
    });
  });
});
