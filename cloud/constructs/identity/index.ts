import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Fn, RemovalPolicy } from 'aws-cdk-lib';

interface IdentityProps {
}

export class Identity extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly client: cognito.UserPoolClient;
  public readonly domain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: IdentityProps) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'userpool', {
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {},
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.client = this.userPool.addClient('app-client', {
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      generateSecret: true,
    });

    // we need a globally unique domain name for the user pool. Can be omitted if you only have one user pool like in production
    const stackId = Fn.select(2, Fn.split('/', Fn.ref('AWS::StackId')))
    this.domain = this.userPool.addDomain('domain', {
      cognitoDomain: {
        domainPrefix: `byt-${stackId}`,
      }
    })
  }
}