export const handler = async (req) => {
  console.log(`Hello, world from JS! - ${req}`);
  return {
    statusCode: 200,
  }
};
