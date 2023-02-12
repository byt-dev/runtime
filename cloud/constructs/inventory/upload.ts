import * as cdk from 'aws-cdk-lib'
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from 'constructs'
import { TypeScriptCode } from '@mrgrain/cdk-esbuild'
import * as path from 'path'
import { LambdaConfig } from '../lambda-config'
export interface UploadApiProps {
  readonly bucket: cdk.aws_s3.IBucket
  readonly cognito: {
    readonly userPoolId: string
    readonly clientId: string
    readonly domain: string
    readonly region: string
  }
}

export class UploadApi extends Construct {
  public readonly distribution: cdk.aws_cloudfront.Distribution

  constructor(scope: Construct, id: string, props: UploadApiProps) {
    super(scope, id)

    const { bucket } = props
    const code = new TypeScriptCode(path.join(__dirname, 'edge/upload.origin-request.ts'), {
      buildOptions: {
        format: "cjs",
        outfile: "index.js",
      },
    })

    const fn = new cdk.aws_cloudfront.experimental.EdgeFunction(this, "handler", {
      code,
      runtime: Runtime.NODEJS_18_X,
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
    });


    const codeResponse = new TypeScriptCode(path.join(__dirname, 'edge/upload.origin-response.ts'), {
      buildOptions: {
        format: "cjs",
        outfile: "index.js",
    },
    })

    const fnResponse = new cdk.aws_cloudfront.experimental.EdgeFunction(this, "response.handler", {
      code: codeResponse,
      runtime: Runtime.NODEJS_18_X,
      handler: "index.handler",
      timeout: cdk.Duration.seconds(10),
      memorySize: 1024,
    });

    const lambda = new LambdaConfig(this, 'LambdaConfig', {
      function: fn,
      config: {
        cognito: props.cognito
      },
    })

    const myHostedZone = cdk.aws_route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: 'Z063149824WBMACIEVUV5',
      zoneName: 'run.byt.dev',
    });

    // Create "upload.byt.dev" cname
    const domain = new cdk.aws_route53.CnameRecord(this, 'domain', {
      zone: myHostedZone,
      recordName: 'upload',
      domainName: 'run.byt.dev',
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
        originRequestPolicy: cdk.aws_cloudfront.OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022,
        edgeLambdas: [
          {
            includeBody: false,
            functionVersion: lambda.version,
            eventType: cdk.aws_cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
          {
            includeBody: false,
            functionVersion: fnResponse.currentVersion,
            eventType: cdk.aws_cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
          }
        ]
      },
      certificate: cert,
      domainNames: [domain.domainName],
      priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_100,
    });

  }
}