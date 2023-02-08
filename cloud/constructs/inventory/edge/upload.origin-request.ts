import { ulid } from "ulid";

export const handler = async (event: any, _context: any) => {
  console.log({event: JSON.stringify(event, null, 2), _context: JSON.stringify(_context, null, 2)})
  const request = event.Records[0].cf.request;
  const { headers } = request;

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
  request.uri = `/${ulid()}.gz`;

  return request;
};
