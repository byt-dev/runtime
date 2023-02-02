import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { ulid } from "ulid";
import { readAll, readerFromStreamReader } from "https://deno.land/std@0.175.0/streams/mod.ts";

export interface ReservedLambdaEnv {
  _HANDLER: string; // – The handler location configured on the function.
  _X_AMZN_TRACE_ID: string; // – The X-Ray tracing header.

  // AWS_REGION – The AWS Region where the Lambda function is executed.

  // AWS_EXECUTION_ENV – The runtime identifier, prefixed by AWS_Lambda_—for example, AWS_Lambda_java8.

  // AWS_LAMBDA_FUNCTION_NAME – The name of the function.

  // AWS_LAMBDA_FUNCTION_MEMORY_SIZE – The amount of memory available to the function in MB.

  // AWS_LAMBDA_FUNCTION_VERSION – The version of the function being executed.

  // AWS_LAMBDA_LOG_GROUP_NAME, AWS_LAMBDA_LOG_STREAM_NAME – The name of the Amazon CloudWatch Logs group and stream for the function.

  // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN – The access keys obtained from the function's execution role.

  // AWS_LAMBDA_RUNTIME_API – (Custom runtime) The host and port of the runtime API.

  // LAMBDA_TASK_ROOT – The path to your Lambda function code.

  // LAMBDA_RUNTIME_DIR – The path to runtime libraries.

  // TZ
}

// event: '{\n' +
// '  "Records": [\n' +
// '    {\n' +
// '      "eventVersion": "2.1",\n' +
// '      "eventSource": "aws:s3",\n' +
// '      "awsRegion": "eu-central-1",\n' +
// '      "eventTime": "2022-03-09T12:53:18.991Z",\n' +
// '      "eventName": "ObjectCreated:Put",\n' +
// '      "userIdentity": {\n' +
// '        "principalId": "AWS:AROAUQPPRB3ZNGYHF4HVR:CognitoIdentityCredentials"\n' +
// '      },\n' +
// '      "requestParameters": {\n' +
// '        "sourceIPAddress": "79.140.182.36"\n' +
// '      },\n' +
// '      "responseElements": {\n' +
// '        "x-amz-request-id": "VASH9Z1W8ASDWZ2J",\n' +
// '        "x-amz-id-2": "wnqz63fvLheJ8ZZOyPzfJf2h3hGN4nIHJWKxKn+Xqhd3CpIlI5H6VCzBOEA/EGkUJG2lv36CtuqGNplTf6h1p0qvtZbeVfgR"\n' +
// '      },\n' +
// '      "s3": {\n' +
// '        "s3SchemaVersion": "1.0",\n' +
// '        "configurationId": "tf-s3-lambda-20220309124601547800000003",\n' +
// '        "bucket": {\n' +
// '          "name": "tfc-runtime-assets20220308140024768500000001",\n' +
// '          "ownerIdentity": {\n' +
// '            "principalId": "A2DXS7J34ZVU0I"\n' +
// '          },\n' +
// '          "arn": "arn:aws:s3:::tfc-runtime-assets20220308140024768500000001"\n' +
// '        },\n' +
// '        "object": {\n' +
// '          "key": "private/eu-central-1%3A6f0d59ae-1b13-4f51-b984-2735eb52a213/01FXQBVB7BH9MAC8WQ5YVDKXWJ.zip",\n' +
// '          "size": 45,\n' +
// '          "eTag": "ce2d443c618551b37b191c02435ac0ba",\n' +
// '          "sequencer": "006228A33EEB14B54C"\n' +
// '        }\n' +
// '      }\n' +
// '    }\n' +
// '  ]\n' +
// '}',
// context: '{\n' +
// '  "callbackWaitsForEmptyEventLoop": true,\n' +
// '  "functionVersion": "$LATEST",\n' +
// '  "functionName": "handler-c8ea63d016511e6d66e3c3836c3af50c1f86198bd8",\n' +
// '  "memoryLimitInMB": "512",\n' +
// '  "logGroupName": "/aws/lambda/handler-c8ea63d016511e6d66e3c3836c3af50c1f86198bd8",\n' +
// '  "logStreamName": "2022/03/09/[$LATEST]19f9a063bd1a462787da1a895fd757de",\n' +
// '  "invokedFunctionArn": "arn:aws:lambda:eu-central-1:310276853490:function:handler-c8ea63d016511e6d66e3c3836c3af50c1f86198bd8",\n' +
// '  "awsRequestId": "e9c3860c-b8e1-4a97-8516-34723f88b791"\n' +
// '}',

export type LambdaRuntimeEnv = {
  [key in keyof ReservedLambdaEnv]: ReservedLambdaEnv[key];
};


export const handler = async (event: any, _context: any) => {
  console.log(Deno.inspect({ event, _context }, { depth: 20 }))

  const s3client = new S3Client({ credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
    sessionToken: Deno.env.get('AWS_SESSION_TOKEN')!,
  }, region: Deno.env.get('AWS_REGION'), })

  const inventoryTableName = Deno.env.get('INVENTORY_TABLE');

  if (!inventoryTableName) {
    throw new Error("INVENTORY_TABLE is not defined");
  }

  // iterate over all records
  for (const record of event.Records) {
    console.log({ record });

    const s3 = record.s3;
    const bucket = s3.bucket.name;
    const key = decodeURIComponent(s3.object.key);

    console.log({ bucket, key });

    // get second element of key
    // const identity = key.split("/")[1];

    const result = await s3client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    console.log({ result });

    const scope = ulid();

    console.log({ scope });

    if (result.Body) {
      console.log({ Body: result.Body })
      try {
        const streamReader = result.Body
          .pipeThrough(new DecompressionStream("gzip"))
          .getReader();
        const reader = readerFromStreamReader(streamReader);
        const body = await readAll(reader);
        const newKey = `live/${scope}/index.js`;
        await s3client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: newKey,
            Body: body,
          })
        );
      }
      catch (error) {
        console.error(error);
      }
    }
  }
};
