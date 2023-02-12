import payloadType from './upload.origin-request.payload.json'
import { handler } from './upload.origin-request'
import * as fs from "fs";
import * as path from "path";

const ulidValue = "01F1ZQZJ1XQZJ0XQZJ1XQZJ1XQ"

jest.mock("ulid", () => ({
  ulid: jest.fn().mockReturnValue('01F1ZQZJ1XQZJ0XQZJ1XQZJ1XQ'),
}));

jest.mock("jose", () => ({
  createLocalJWKSet: jest.fn().mockReturnValue({}),
  jwtVerify: jest.fn().mockReturnValue({ payload: { sub: 'user', username: 'test-foobar' } }),
}));

// @ts-ignore
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({}),
  })
);

describe('upload.origin-request', () => {
  let payload: typeof payloadType;

  beforeEach(() => {
    payload = JSON.parse(fs.readFileSync(path.join(__dirname, "upload.origin-request.payload.json"), "utf-8")) as any
  })

  it('works for PUT request', async () => {
    const result = await handler(payload.event, payload.context)
    expect(result).toMatchSnapshot()
  })

  it('denies GET request', async () => {
    const { event, context } = {...payload}
    event.Records[0].cf.request.method = 'GET'
    const result = await handler(event, context)
    expect(result).toMatchSnapshot()
  })

  it('denies POST request', async () => {
    const { event, context } = {...payload}
    event.Records[0].cf.request.method = 'POST'
    const result = await handler(event, context)
    expect(result).toMatchSnapshot()
  })

  it ('denies request without "authorization" header', async () => {
    const { event, context } = {...payload}
    delete event.Records[0].cf.request.headers.authorization
    const result = await handler(event, context)
    expect(result).toMatchSnapshot()
  })

  it ('sets "x-amz-acl" header so the file can be accessed properly', async () => {
    const { event, context } = {...payload}
    event.Records[0].cf.request.method = 'PUT'
    const result = await handler(event, context)
    expect(result.headers['x-amz-acl']).toEqual([{ key: 'x-amz-acl', value: 'bucket-owner-full-control' }])
  })

  it ('sets "host" header', async () => {
    const { event, context } = {...payload}
    event.Records[0].cf.request.method = 'PUT'
    const result = await handler(event, context)
    expect(result.headers['host']).toEqual([{ key: 'Host', value: payload.event.Records[0].cf.request.origin.s3.domainName }])
  })

  it ('rewrites the URI to a random ULID', async () => {
    const { event, context } = {...payload}
    const result = await handler(event, context)
    expect(result.uri).toEqual(`/test-foobar/${ulidValue}.gz`)
  })
})