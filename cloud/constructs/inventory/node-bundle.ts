import { join, dirname } from "https://deno.land/std@0.171.0/path/mod.ts";
import { Code } from "aws-cdk-lib/aws-lambda";
import * as esbuild from "https://deno.land/x/esbuild@v0.17.4/mod.js";

export const bundle = async (path: string, handler = 'handler') => {
  const dist = join(dirname(path), 'dist')
  try {
    const result = await esbuild.build({
      plugins: [],
      entryPoints: [path],
      outfile: join(dist, "index.js"),
      bundle: true,
      format: "esm",
    });

    esbuild.stop();
    return {
      code: Code.fromAsset(dist),
      handler: `index.${handler}`,
      dist,
      bundled: join(dist, "index.js")
    }
  } catch (error) {
    console.log({error})
    Deno.exit(1);
  }
}