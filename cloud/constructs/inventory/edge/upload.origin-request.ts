import { ulid } from "ulid";
import * as fs from "fs";
import * as path from "path";
import * as jose from "jose";

const config = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config.json"), "utf-8"),
)

export const handler = async (event: any, _context: any) => {
  console.log({event: JSON.stringify(event, null, 2), _context: JSON.stringify(_context, null, 2)})
  console.log({config: JSON.stringify(config, null, 2)})
  const request = event.Records[0].cf.request;
  const { headers } = request;

  const { region, userPoolId, clientId } = config.cognito;
  const cognitoUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  const jwks = jose.createLocalJWKSet(config.jwksJson);
  // check for authorization header
  const token = headers['authorization']?.[0]?.value;

  if (!token) {
    return {
      status: '403',
      statusDescription: 'Forbidden',
      body: 'Forbidden',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
      },
    };
  }

  // extract Bearer token
  const [, jwt] = token.split(' ');

  let username: string;

  try {
    const { payload } = await jose.jwtVerify(jwt, jwks, {
      issuer: cognitoUrl,
    });

    console.log({payload})
    username = payload.username as string;
  }
  catch (e) {
    console.log({e})
    return {
      status: '403',
      statusDescription: 'Forbidden',
      body: 'Forbidden',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
      },
    };
  }

  if (request.method !== 'PUT') {
    return {
      status: '403',
      statusDescription: 'Forbidden',
      body: 'Forbidden',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
      },
    };
  }

  const s3domain = request.origin.s3.domainName;

  const allowedHeaders = {
    'x-amz-acl': [{key: 'x-amz-acl', value: 'bucket-owner-full-control'}],
    'host': [{ key: 'Host', value: s3domain}],
    'x-forwarded-for': headers['x-forwarded-for'],
    'user-agent': headers['user-agent'],
    'via': headers['via'],
    'content-length': headers['content-length'],
    'accept-encoding': headers['accept-encoding'],
  }

  request.headers = allowedHeaders;
  request.uri = `/${username}/${ulid()}.gz`;

  return request;
};
