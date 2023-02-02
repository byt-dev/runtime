// docs: https://doc.deno.land/https/deno.land/x/dnt/transform.ts
import { transform as denoTransform } from "https://deno.land/x/dnt/transform.ts";
import { bundle } from './deno-bundle.ts'
import { join } from "https://deno.land/std@0.171.0/path/mod.ts";
import { Code } from "aws-cdk-lib/aws-lambda";

export const transform = async (path: string, handler = 'handler') => {
  const { bundled, dist } = await bundle(path, handler)

  const outputResult = await denoTransform({
    entryPoints: [bundled],
    testEntryPoints: [],
    shims: [],
    testShims: [],
    target: "ES2020",
    // mappings: {}, // optional specifier mappings
  });

  console.log(Deno.inspect(outputResult, { depth: 20 }));

  for (const file of outputResult.main.files) {
    await Deno.writeFile(join(dist, file.filePath), new TextEncoder().encode(file.fileText))
  }

  return {
    code: Code.fromAsset(dist),
    handler: `index.${handler}`,
    dist,
  }
}