console.log('Hello, world from JS!');

export default async () => (Response.json({
  name: 'Hello',
  foo: 1,
  bar: true,
  baz: [1, 2, 'three']
}, {
  headers: {
    'content-type': 'foo/bar'
  }
}));