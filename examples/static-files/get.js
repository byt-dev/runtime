export default async () => {
  const file = await byt.getFile('file.gz')
  return Response.json({
    file: new TextDecoder().decode(file)
  })
}