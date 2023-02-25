// main.tsx
import React from "https://esm.sh/react@18.2.0";
import satori, { init } from "https://esm.sh/satori@0.3.2/wasm";
import initYoga from "https://esm.sh/yoga-wasm-web@0.3.1";
import { render } from "https://deno.land/x/resvg_wasm/mod.ts";

const wasmPromise = byt.getFile("yoga.wasm");
const avatarPromise = byt.getFile("avatar.jpg");
const fontPromise = byt.getFile("Roboto-Regular.ttf");

const [yogaWasm, avatar, fontData] = await Promise.all([wasmPromise, avatarPromise, fontPromise]);

const yoga =
  await (initYoga as unknown as (wasm: Uint8Array) => Promise<unknown>)(yogaWasm);
init(yoga);

// base64 encode
const base64 = btoa(String.fromCharCode(...new Uint8Array(avatar)));

const template = (
  <div
    style={{
      display: "flex",
      flexFlow: "column nowrap",
      alignItems: "stretch",
      width: "600px",
      height: "400px",
      backgroundImage: "linear-gradient(to top, #7028e4 0%, #e5b2ca 100%)",
      color: "#000",
    }}
  >
    <div
      style={{
        display: "flex",
        flex: "1 0",
        flexFlow: "row nowrap",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <img
        style={{
          border: "8px solid rgba(255, 255, 255, 0.2)",
          borderRadius: "50%",
        }}
        src={`data:image/jpeg;base64,${base64}`}
        alt="animals"
      />
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "6px",
        padding: "12px",
        borderRadius: "4px",
        background: "rgba(255, 255, 255, 0.2)",
        color: "#fff",
        fontSize: "22px",
      }}
    >
      Hello World! :)
    </div>
  </div>
);


const foo = async () => {
  // download font as roboto.ttf

  // convert html to svg
  const svg = await satori(
    template,
    {
      width: 600,
      height: 400,
      fonts: [
        {
          name: "Roboto",
          data: fontData,
          weight: 400,
          style: 'normal',
        },
      ]
    },
  );

  const png = await render(svg);
  // base64 encode
  const base64 = btoa(String.fromCharCode(...new Uint8Array(png)));

  return new Response(base64, {
    headers: {
      "Content-Type": "image/png",
      "x-is-base64": "true",
    },
  });
}

export default foo;