import * as cdk from 'aws-cdk-lib'
import { Function, Runtime, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { join, fromFileUrl, dirname } from "https://deno.land/std@0.171.0/path/mod.ts";
import { Construct } from 'constructs'
import { transform } from "./deno-transform.ts";

const path = join(dirname(fromFileUrl(import.meta.url)), "pre-signed-url.ts");
const { code, handler } = await transform(path) as any;

export interface UploadApiProps {
  readonly bucket: cdk.aws_s3.IBucket
}

export class UploadApi extends Construct {
  public readonly distribution: cdk.aws_cloudfront.Distribution

  constructor(scope: Construct, id: string, props: UploadApiProps) {
    super(scope, id)

    const { bucket } = props

    const fn = new cdk.aws_cloudfront.experimental.EdgeFunction(this, "handler", {
      code,
      runtime: Runtime.NODEJS_18_X,
      handler,
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
    });

    const myHostedZone = cdk.aws_route53.HostedZone.fromHostedZoneId(this, 'HostedZone', 'Z063149824WBMACIEVUV5');

    // Create "upload.byt.dev" cname
    const domain = new cdk.aws_route53.CnameRecord(this, 'domain', {
      zone: myHostedZone,
      recordName: 'upload',
      domainName: 'byt.dev',
    })

    const cert = new cdk.aws_certificatemanager.Certificate(this, 'Certificate', {
      domainName: domain.domainName,
      certificateName: 'Byt Upload Service', // Optionally provide an certificate name
      validation: cdk.aws_certificatemanager.CertificateValidation.fromDns(myHostedZone),
    });

    const identity = new cdk.aws_cloudfront.OriginAccessIdentity(this, 'OAI')
    bucket.grantReadWrite(identity)

    // cloudfront distribution
    this.distribution = new cdk.aws_cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new cdk.aws_cloudfront_origins.S3Origin(bucket, {originAccessIdentity: identity}),
        allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
        edgeLambdas: [
          {
            includeBody: false,
            functionVersion: fn.currentVersion,
            eventType: cdk.aws_cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
        ]
      },
      certificate: cert,
      domainNames: [domain.domainName],
    });

  }
}