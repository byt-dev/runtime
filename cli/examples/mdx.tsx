/** @jsx h */
import * as mdx from "https://esm.sh/@mdx-js/mdx@2.3.0";
import { h } from "https://esm.sh/preact@10.12.1";
import * as runtime from "https://esm.sh/preact@10.12.1/jsx-runtime";
import { renderToString } from "https://esm.sh/preact-render-to-string@5.2.6?deps=preact@10.12.1";
import { Hono } from 'https://deno.land/x/hono/mod.ts'

const firstPost = `
export const Thing = () => <>World!</>

# Hello first Post <Thing />

- one
- two
- three
`

const secondPost = `
export const Thing = () => <>World!</>

# Hello second Post <Thing />

- one
- two
- three
`

const posts = {
  first: firstPost,
  second: secondPost,
}

const renderPage = async (id) => {
  const content = posts[id]
  const foo = await mdx.compile(content, {outputFormat: 'function-body', development: false });
  const { default: MdxContent} = await mdx.run(foo, runtime)

  const page = (
    <div>
      <MdxContent />
    </div>
  );

  return renderToString(page);
}

const app = new Hono()

app.all('/20da6b64-d502-468a-b425-fe8697dd9e7a/mdx', async (c) => {
  console.log(c.req)
  const { pageQuery } = c.req.query()

  if (pageQuery) {
    const html = await renderPage(pageQuery)
    return c.html(html)
  } else {
    const page = (
      <div>
        <h1>Posts</h1>
        <ul>
          <li><a href="/20da6b64-d502-468a-b425-fe8697dd9e7a/mdx?post=first">First Post</a></li>
          <li><a href="/20da6b64-d502-468a-b425-fe8697dd9e7a/mdx?post=second">Second Post</a></li>
        </ul>
      </div>
    );

    const html = renderToString(page);
    return c.html(html)
  }
})

export default app.request