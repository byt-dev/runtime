export default async () => {
  const files = await byt.listFiles()
  return Response.json({
    files
  })
}