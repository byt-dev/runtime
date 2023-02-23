export default async () => (Response.json({
  name: 'Hello',
}, {
  headers: {
    'content-type': 'image/png',
    'X-Is-Base64': 'true',
  }
}));