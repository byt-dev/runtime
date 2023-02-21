export default async (event) => {
  console.log(`Hello, world from JS! ${JSON.stringify(event)}`);
  return Response.json({
    message: 'Hello, world from JS!',
    input: event,
  });
};
