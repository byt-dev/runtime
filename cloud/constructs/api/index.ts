import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

export interface ApiProps {
  readonly lambda: cdk.aws_lambda.IFunction
}

export class Api extends Construct {
  public readonly api: cdk.aws_apigateway.RestApi
  public readonly domain: cdk.aws_apigateway.DomainName

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id)

    const api = new cdk.aws_apigateway.RestApi(this, 'api', {
      restApiName: 'api',
      endpointTypes: [cdk.aws_apigateway.EndpointType.EDGE],
      deployOptions: {
        stageName: 'prod',
      },
      binaryMediaTypes: ['image/*', 'image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'application/octet-stream'],
    })

    const integration = new cdk.aws_apigateway.LambdaIntegration(props.lambda, {
      contentHandling: cdk.aws_apigateway.ContentHandling.CONVERT_TO_BINARY,
    })

    const resource = api.root.addResource('{proxy+}')
    resource.addMethod('ANY', integration)

    const myHostedZone = cdk.aws_route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: 'Z063149824WBMACIEVUV5',
      zoneName: 'run.byt.dev',
    });

    const cert = new cdk.aws_certificatemanager.Certificate(this, 'Certificate', {
      domainName: '*.run.byt.dev',
      certificateName: 'Byt Run Service', // Optionally provide an certificate name
      validation: cdk.aws_certificatemanager.CertificateValidation.fromDns(myHostedZone),
    });

    // wildcard domain name
    const apiDomain = new cdk.aws_apigateway.DomainName(this, 'domain', {
      domainName: '*.run.byt.dev',
      endpointType: cdk.aws_apigateway.EndpointType.EDGE,
      mapping: api,
      certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        'cert',
        cert.certificateArn,
      ),
    })

    new cdk.aws_route53.ARecord(this, "apiDNS", {
      zone: myHostedZone,
      recordName: "*.run.byt.dev",
      target: cdk.aws_route53.RecordTarget.fromAlias(
        new cdk.aws_route53_targets.ApiGatewayDomain(apiDomain)
      ),
    });

    this.api = api
    this.domain = apiDomain
  }
}