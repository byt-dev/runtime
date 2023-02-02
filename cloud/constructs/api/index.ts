import * as cdk from 'aws-cdk-lib'
import {} from 'aws-cdk-lib/aws-apigateway'
import { Construct } from 'constructs'

// ApiGateway with proxy Lambda integration and wildcard path

export interface ApiProps {
  readonly lambda: cdk.aws_lambda.IFunction
}

export class Api extends Construct {
  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id)

    const api = new cdk.aws_apigateway.RestApi(this, 'api', {
      restApiName: 'api',
      deployOptions: {
        stageName: 'prod',
      },
    })

    const integration = new cdk.aws_apigateway.LambdaIntegration(props.lambda)

    const resource = api.root.addResource('{proxy+}')
    resource.addMethod('ANY', integration)

    const myHostedZone = cdk.aws_route53.HostedZone.fromHostedZoneId(this, 'HostedZone', 'Z063149824WBMACIEVUV5');

    const cert = new cdk.aws_certificatemanager.Certificate(this, 'Certificate', {
      domainName: 'run.byt.dev',
      certificateName: 'Byt Run Service', // Optionally provide an certificate name
      validation: cdk.aws_certificatemanager.CertificateValidation.fromDns(myHostedZone),
    });

    // wildcard domain name
    new cdk.aws_apigateway.DomainName(this, 'domain', {
      domainName: 'run.byt.dev',
      certificate: cdk.aws_certificatemanager.Certificate.fromCertificateArn(
        this,
        'cert',
        cert.certificateArn,
      ),
    })
  }
}