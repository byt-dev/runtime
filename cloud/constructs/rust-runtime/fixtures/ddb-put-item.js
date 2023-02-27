export default async () => {
  const db = new Db("test")
  await db.putItem("test", {
    foo: "bar",
    baz: "qux"
  })

  const item = await db.getItem("test")
  return Response.json(item)
}