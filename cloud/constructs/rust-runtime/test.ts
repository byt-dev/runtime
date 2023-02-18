import { CloudSpec } from "@cloudspec/aws-cdk";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { argv } from "process";

const deploy = async () => {
  const name = argv[2]
  const cloudspec = new CloudSpec(`lambda-runtime-${name}`, __dirname);
  const bucket = new Bucket(cloudspec.stack, "MyBucket");
  cloudspec.stack.outputs({
    BucketName: bucket.bucketName,
  });
  return await cloudspec.deploy();
};

(async () => {
  const outputs = await deploy();
  console.log(outputs);
})();