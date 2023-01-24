// see build.ts for more info why this exists
import foo from "./emit_bg.wasm";

export default function () {
  const orig = Deno.readFile

  Deno.readFile = async (path: string | URL) => {
    const pathName = (path as URL).pathname || path as string

    if (pathName.endsWith("emit_bg.wasm")) {
      console.log("dynamically loading wasm")
      return foo
    }

    return orig(path)
  }
}