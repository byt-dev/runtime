import * as path from 'path'

export const handler = async (event: any, _context: any) => {
  console.log({event: JSON.stringify(event, null, 2), _context: JSON.stringify(_context, null, 2)})
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;

  const pathname = request.uri;
  const filename = path.basename(pathname, path.extname(pathname));
  const basePath = path.dirname(pathname);
  const baseUrl = 'https://run.byt.dev'
  const url = new URL(path.join(basePath, filename), baseUrl)

  response.body = JSON.stringify({
    id: filename,
    url: url.toString(),
    baseUrl,
  })

  return response;
};
