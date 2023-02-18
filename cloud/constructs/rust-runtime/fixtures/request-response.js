export default async (event) => {
  console.log('Hello, world from JS!');
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello, world from JS!',
      input: event,
    }),
  };
};
