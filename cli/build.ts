import * as esbuild from "https://deno.land/x/esbuild@v0.17.4/mod.js";
import { denoPlugin } from "https://deno.land/x/esbuild_deno_loader@0.6.0/mod.ts";

// the deno bundle is relying on the wasm file being in the same directory
// as the js file. So we need to patch the js file to inline the wasm file at build time
// this adds about 10MB to the bundle size, but it's the only way to get it to work.
// The cli load time overhead is about 200ms on my machine (in total about 400ms)

const file = await Deno.readFile("./byt.ts")
const text = new TextDecoder().decode(file)
// append the wasm patch
const wasmLoader = `import wasmPatch from "./src/wasm_patch/index.ts"; wasmPatch();`
const newText = wasmLoader + text
const newFile = new TextEncoder().encode(newText)
await Deno.writeFile("./byt.release.ts", newFile)

const result = await esbuild.build({
  plugins: [denoPlugin()],
  entryPoints: ["./byt.release.ts"],
  outfile: "./dist/byt.esm.js",
  loader: { ".wasm": "binary" },
  bundle: true,
  format: "esm",
});

console.log(result.outputFiles);

esbuild.stop();