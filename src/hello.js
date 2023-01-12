// import * as mod from "https://deno.land/std@0.171.0/datetime/mod.ts";

// Deno.test("hello", () => {
//   const now = new Date();
//   const actual = mod.format(now, "yyyy-MM-dd HH:mm:ss");
//   const expected = mod.format(now, "yyyy-MM-dd HH:mm:ss");
//   assertEquals(actual, expected);
// });


rust.helloWorld();
console.log(rust.reverse("hello world"));

const buckets = await rust.listBuckets();
console.log({buckets})