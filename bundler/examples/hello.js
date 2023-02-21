import * as path from "https://deno.land/std/path/mod.ts";

const foo = path.join('foo', 'bar', 'baz');
console.log('Hello, world from JS!');

export default {
  name: 'Hello',
  foo: 1,
  bar: true,
  baz: [1, 2, 'three'],
  path: foo,
}