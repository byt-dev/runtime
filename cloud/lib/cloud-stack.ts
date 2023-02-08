import * as cdk from "aws-cdk-lib";
import { CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaRuntime } from '../constructs/lambda-runtime'
import { UploadHandler } from '../constructs/inventory/index'

export class CloudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new cdk.aws_s3.Bucket(this, "LambdaRuntimeBucket");
    const table = new cdk.aws_dynamodb.Table(this, "LambdaRuntimeTable", {
      partitionKey: {
        name: "id",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
    });

    const runtime = new LambdaRuntime(this, "LambdaRuntime", { bucket });
    new CfnOutput(this, "HelloHandlerArn", {
      value: runtime.handler.functionArn,
    });

    const uploadHandler = new UploadHandler(this, "UploadHandler", { bucket, inventory: table });


    //     const authenticatedRole = new CognitoIdentityRole(
    //   this,
    //   "authenticated-identity",
    //   {
    //     cognitoAud: identityPoolId,
    //     cognitoAmr: AuthenticationMethodReference.Authenticated,
    //     policyStatements: [
    //       new iam.S3()
    //         .allow()
    //         .toListBucket()
    //         .on(bucket.arn)
    //         .ifPrefix("private/$${cognito-identity.amazonaws.com:sub}"),
    //       new iam.S3()
    //         .allow()
    //         .toPutObject()
    //         .on(
    //           `${bucket.arn}/private/\$\${cognito-identity.amazonaws.com:sub}`,
    //           `${bucket.arn}/private/\$\${cognito-identity.amazonaws.com:sub}/*`
    //         ),
    //       new iam.Dynamodb()
    //         .allow()
    //         .toPutItem()
    //         .toUpdateItem()
    //         .on(secretStore.arn)
    //         .ifLeadingKeys(
    //           "$${cognito-identity.amazonaws.com:sub}",
    //           new iam.Operator().forAllValues().stringEquals()
    //         ),
    //       new iam.Dynamodb()
    //         .allow()
    //         .toQuery()
    //         .on(secretStore.arn)
    //         .ifLeadingKeys(
    //           "$${cognito-identity.amazonaws.com:sub}",
    //           new iam.Operator().forAllValues().stringEquals()
    //         ),
    //       new iam.Dynamodb()
    //         .allow()
    //         .toQuery()
    //         .on(logsTable.arn)
    //         .ifLeadingKeys(
    //           "$${cognito-identity.amazonaws.com:sub}",
    //           new iam.Operator().forAllValues().stringEquals()
    //         ),
    //       new iam.Appsync()
    //         .allow()
    //         .toGraphQL()
    //         .on(`${appsync.arn}/*`)
    //     ],
    //   }
    // );

  }
}
