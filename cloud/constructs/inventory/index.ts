import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Function, Runtime, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { join, fromFileUrl, dirname } from "https://deno.land/std@0.171.0/path/mod.ts";
import { bundle } from "./deno-bundle.ts";

export interface AssetsConfig {
  identityPoolId: string;
  apiGatewayUrl: string;
  bucket: Bucket;
  inventory: Table;
}

export interface UploadHandlerConfig {
  bucket: Bucket;
  inventory: Table;
}

const path = join(dirname(fromFileUrl(import.meta.url)), "pre-signed-url.ts");
const { code, handler } = await bundle(path);

export class UploadHandler extends Construct {
  constructor(scope: Construct, id: string, config: UploadHandlerConfig) {
    super(scope, id);

    const { bucket, inventory } = config;

    // deno 1.30.0 taken from https://github.com/beginner-corp/begin-deno-runtime
    const layerArn = 'arn:aws:lambda:eu-central-1:455488262213:layer:DenoRuntime:14'

    // Deno Layer
    const layer = LayerVersion.fromLayerVersionArn(
      this,
      "denoRuntimeLayer",
      layerArn,
    );

    const fn = new Function(this, "handler", {
      code,
      environment: {
        INVENTORY_TABLE: inventory.tableName,
      },
      runtime: Runtime.PROVIDED_AL2,
      handler,
      layers: [layer],
      timeout: Duration.seconds(30),
      memorySize: 1024,
    });

    bucket.grantReadWrite(fn);
    inventory.grantReadWriteData(fn);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(fn),
      {
        prefix: "uploads/",
      }
    );
  }
}

export class Assets extends Construct {
  constructor(scope: Construct, name: string, config: AssetsConfig) {
    super(scope, name);

  }
}
