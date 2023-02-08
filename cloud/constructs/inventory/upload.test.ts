import { CloudSpec } from "@cloudspec/aws-cdk";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { UploadApi } from "./upload";
import * as zlib from "zlib";

const cloudspec = new CloudSpec("upload-test", __dirname, {region: "us-east-1"});
const bucket = new Bucket(cloudspec.stack, "MyBucket");
const upload = new UploadApi(cloudspec.stack, "UploadTest", { bucket });
cloudspec.stack.outputs({
  BucketName: bucket.bucketName,
  Domain: upload.distribution.domainName,
});

describe("UploadAPI", () => {
  it("uploads successfully", async () => {
    console.log({outdir: cloudspec.outdir})
    const outputs = await cloudspec.deploy();
    // tar and gzip the following content as a single file 'console.log("hello world from cloudspec!")'
    const body = new TextEncoder().encode('console.log("hello world from cloudspec!")');
    // gzip the body
    const gzipped: Buffer = await new Promise((resolve, reject) => {
      const gzip = zlib.createGzip();
      const chunks: Uint8Array[] = [];
      gzip.on("data", (chunk) => chunks.push(chunk));
      gzip.on("end", () => resolve(Buffer.concat(chunks)));
      gzip.on("error", reject);
      gzip.write(body);
      gzip.end();
    });

    const url = `https://${outputs.Domain}/upload.gz`;

    // upload gzipped file to the url
    const uploadResult = await fetch(url, {
      method: "PUT",
      body: gzipped,
      headers: {
        "Content-Type": "application/gzip",
      },
    });

    const response = JSON.parse(await uploadResult.text());
    expect(uploadResult.status).toEqual(200);
    expect(response).toEqual({
      url: expect.stringMatching(/^https:\/\/run\.byt\.dev\/[A-Z0-9]{26}$/),
      id: expect.stringMatching(/^[A-Z0-9]{26}$/),
      baseUrl: expect.stringMatching(`https://run.byt.dev`),
    });
  }, 600_000);
});