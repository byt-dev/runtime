console.log('Hello, world from JS!');

const myResponse = async () => {
  return Response.json({
    name: 'Hello',
    foo: 1,
    bar: true,
    baz: [1, 2, 'three']
  })
}

export default myResponse