// copied from https://raw.githubusercontent.com/henrist/cdk-lambda-config/d0b362c3abe37bdf64c574213a22803126fc8c46/src/handler.ts
// Cheating a bit as it seems the type is not available in the export.
// TODO: Duplicate the relevant type parts?
import Zip from "adm-zip"
import type { OnEventHandler } from "aws-cdk-lib/custom-resources/lib/provider-framework/types"
import { LambdaClient, GetFunctionCommand, UpdateFunctionCodeCommand } from "@aws-sdk/client-lambda"
import { mkdtempSync, writeFileSync } from "fs"
import { resolve } from "path"
import * as jose from "jose";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Config = Record<string, any>

export const handler: OnEventHandler = async (event) => {
  switch (event.RequestType) {
    case "Delete":
      // Nothing to do on delete.
      return {
        PhysicalResourceId: event.PhysicalResourceId,
      }

    case "Create":
    case "Update":
      console.log(JSON.stringify(event))

      const functionArnFull = event.ResourceProperties.FunctionArn as string
      const config = event.ResourceProperties.Config as Config

      const functionArn = withoutVersion(functionArnFull)
      console.log(`Modifying function '${functionArnFull}'`)

      const lambda = new LambdaClient({
        region: getFunctionRegion(functionArn),
      })

      const { Code } = await lambda.send(new GetFunctionCommand({
        FunctionName: functionArn,
      }))

      if (!Code || !Code.Location) {
        throw new Error(`Could not get code for function '${functionArn}'`)
      }

      const response = await fetch(Code.Location)
      const data = await response.arrayBuffer()
      const buffer = Buffer.from(data)

      const { CodeSha256, Version, FunctionArn } = await lambda.send(new UpdateFunctionCodeCommand({
        FunctionName: functionArn,
        ZipFile: addConfigToZip(buffer, {...config, jwksJson: (await fetchJwks(config))}),
        Publish: true,
      }))

      console.log("Updated function", { CodeSha256, Version, FunctionArn })

      return {
        PhysicalResourceId: functionArn,
        Data: { CodeSha256, Version, FunctionArn },
      }
  }
}

function getFunctionRegion(arn: string): string {
  // Example value: arn:aws:lambda:eu-west-1:112233445566:function:my-function
  // Result: eu-west-1
  const match = /^arn:aws:lambda:([^:]+):/.exec(arn)
  if (!match) {
    throw new Error(`Could not extract region from '${arn}'`)
  }
  return match[1]
}

function withoutVersion(arn: string): string {
  // Example value: arn:aws:lambda:eu-west-1:112233445566:function:my-function:1
  // Result: arn:aws:lambda:eu-west-1:112233445566:function:my-function
  const match = /^(arn:aws:lambda:[^:]+:[^:]+:function:[^:]+):[^:]+$/.exec(arn)
  if (!match) {
    return arn
  }
  return match[1]
}

function addConfigToZip(data: Buffer, config: Config): Buffer {
  const lambdaZip = new Zip(data)
  const tempDir = mkdtempSync("/tmp/lambda-package")
  lambdaZip.extractAllTo(tempDir, true)
  writeFileSync(
    resolve(tempDir, "config.json"),
    Buffer.from(JSON.stringify(config, null, 2)),
  )

  const newLambdaZip = new Zip()
  newLambdaZip.addLocalFolder(tempDir)
  return newLambdaZip.toBuffer()
}

async function fetchJwks(config: Record<string, any>): Promise<Record<string, unknown>> {
  const { region, userPoolId } = config.cognito;
  const cognitoUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  const jwksJson = await (await fetch(`${cognitoUrl}/.well-known/jwks.json`)).json();
  return jwksJson;
}