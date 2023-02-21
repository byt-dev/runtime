/** @jsx h */
import * as mdx from "https://esm.sh/@mdx-js/mdx@2.3.0";
import { h } from "https://esm.sh/preact@10.12.1";
import * as runtime from "https://esm.sh/preact@10.12.1/jsx-runtime";
import { renderToString } from "https://esm.sh/preact-render-to-string@5.2.6?deps=preact@10.12.1";

export default async (req: Request) => {
  const content = `
  export const Thing = () => <>World!</>

  # Hello, <Thing />

  - one
  - two
  - three
  `

  const {default: MdxContent} = await mdx.evaluate(content, {...runtime, development: false });

  const page = (
    <div>
      <h1>Current time</h1>
      <MdxContent />
    </div>
  );

  const html = renderToString(page);
  return String(html);
}