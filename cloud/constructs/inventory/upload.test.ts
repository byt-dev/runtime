import { CloudSpec } from "@cloudspec/aws-cdk";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { UploadApi } from "./upload";
import * as zlib from "zlib";
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminConfirmSignUpCommand, AdminSetUserPasswordCommand } from "@aws-sdk/client-cognito-identity-provider";
import { ulid } from "ulid";
import { Amplify, Auth } from "aws-amplify";
// import { Credentials } from "@aws-amplify/core";
// import { homedir } from "os";
// import { LocalStorage } from "node-localstorage";

const region = "us-east-1";

const cloudspec = new CloudSpec("upload-test", __dirname, {region});
const bucket = new Bucket(cloudspec.stack, "MyBucket");
const userPool = new cognito.UserPool(cloudspec.stack, 'myTestPool', {
  selfSignUpEnabled: false,
  autoVerify: {
    email: true,
  },
});
const domain = userPool.addDomain('myTestPoolDomain', {
  cognitoDomain: {
    domainPrefix: `testpool-${userPool.node.addr}`,
  }
})
const client = new cognito.UserPoolClient(cloudspec.stack, 'myTestPoolClient', {
  userPool,
})


const upload = new UploadApi(cloudspec.stack, "UploadTest", {
  bucket,
  cognito: {
    userPoolId: userPool.userPoolId,
    clientId: client.userPoolClientId,
    domain: domain.domainName,
    region
  },
});
cloudspec.stack.outputs({
  BucketName: bucket.bucketName,
  Domain: upload.distribution.domainName,
  UserPoolId: userPool.userPoolId,
  UserPoolClientId: client.userPoolClientId,
});

describe("UploadAPI", () => {
  it("uploads successfully", async () => {
    // console.log({outdir: cloudspec.outdir})
    const outputs = await cloudspec.deploy({});
    const userId = ulid();
    const cognitoClient = new CognitoIdentityProviderClient({region})
    const user = await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: outputs.UserPoolId,
      Username: `testuser-${userId}`,
      UserAttributes: [
        {
          Name: "email",
          Value: `sebastian+${userId}@korfmann.net`,
        },
        {
          Name: "email_verified",
          Value: "true",
        },
      ],
      // don't send emails
      MessageAction: 'SUPPRESS',
    }));

    const password = `aB1?${ulid()}`;

    console.log({
      user,
      password,
      outputs,
    })

    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: outputs.UserPoolId,
      Username: `testuser-${userId}`,
      Password: password,
      Permanent: true,
    }));


    // Amplify.Logger.LOG_LEVEL = "DEBUG";

    Amplify.configure({
      Auth: {
        region,
        userPoolId: outputs.UserPoolId,
        userPoolWebClientId: outputs.UserPoolClientId,
        mandatorySignIn: true,
      },
    });

    const auth = await Auth.signIn(`testuser-${userId}`, password)

    // console.log({user, auth, token: JSON.stringify(auth.signInUserSession)})
    // tar and gzip the following content as a single file 'console.log("hello world from cloudspec!")'
    const body = new TextEncoder().encode('console.log("hello world from cloudspec!")');
    // gzip the body
    const gzipped: Buffer = await new Promise((resolve, reject) => {
      const gzip = zlib.createGzip();
      const chunks: Uint8Array[] = [];
      gzip.on("data", (chunk) => chunks.push(chunk));
      gzip.on("end", () => resolve(Buffer.concat(chunks)));
      gzip.on("error", reject);
      gzip.write(body);
      gzip.end();
    });

    const url = `https://${outputs.Domain}/upload.gz`;

    // upload gzipped file to the url
    const uploadResult = await fetch(url, {
      method: "PUT",
      body: gzipped,
      headers: {
        "Content-Type": "application/gzip",
        "Authorization": `Bearer ${auth.signInUserSession.accessToken.jwtToken}`
      },
    });

    const responseText = await uploadResult.text()
    // console.log({responseText, uploadResult})
    const response = JSON.parse(responseText);
    expect(uploadResult.status).toEqual(200);
    expect(response).toEqual({
      url: expect.stringMatching(/^https:\/\/run\.byt\.dev\/testuser-[A-Z0-9]{26}\/[A-Z0-9]{26}$/),
      id: expect.stringMatching(/^[A-Z0-9]{26}$/),
      baseUrl: expect.stringMatching(`https://run.byt.dev`),
    });
  }, 600_000);
});