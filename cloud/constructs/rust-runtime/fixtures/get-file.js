export default async () => {
  const file = await byt.getFile('file.txt')
  return Response.json({
    file: new TextDecoder().decode(file)
  })
}