import * as path from "https://deno.land/std/path/mod.ts";

export default async () => {
  const foo = path.join('foo', 'bar', 'baz');
  console.log('Hello, world from JS!');

  return Response.json({
    name: 'Hello',
    foo: 1,
    bar: true,
    baz: [1, 2, 'three'],
    path: foo,
  })
}