/** @jsx h */
import * as mdx from "https://esm.sh/@mdx-js/mdx@2.3.0";
import { h } from "https://esm.sh/preact@10.12.1";
import * as runtime from "https://esm.sh/preact@10.12.1/jsx-runtime";
import { renderToString } from "https://esm.sh/preact-render-to-string@5.2.6?deps=preact@10.12.1";

const resolve = async (req: Request) => {
// the indentation is important here, leading whitespace will mess up the mdx
// for the `export const Thing`. Not sure if this is a bug or not.
  const content = `
export const Thing = () => <>World!</>

# Hello <Thing />

- one
- two
- three
`

  console.log(content);

  const foo = await mdx.compile(content, {outputFormat: 'function-body', development: false });
  const { default: MdxContent} = await mdx.run(foo, runtime)

  const page = (
    <div>
      <h1>Current time</h1>
      <MdxContent />
    </div>
  );

  const html = renderToString(page);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

export default resolve