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

[Back](/mdx)
`

const secondPost = `
export const Thing = () => <>World!</>

# Hello second Post <Thing />

- one
- two
- three

[Back](/mdx)
`

const posts = {
  first: firstPost,
  second: secondPost,
}

const renderPage = async (content) => {
  const foo = await mdx.compile(content, {outputFormat: 'function-body', development: false });
  const { default: MdxContent} = await mdx.run(foo, runtime)

  const page = (
    <div>
      <MdxContent />
    </div>
  );

  return renderToString(page);
}

const template = (html) => (`
    <!DOCTYPE html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      ${html}
    </html>`
);

const app = new Hono()

app.all('/mdx', async (c) => {
  // tailwindcss styles
  const page = (
    <body>
      <div>
        <h1 class="text-3xl font-bold underline">Posts</h1>
        <ul role="list" className="divide-y divide-gray-200">
          <li class="relative bg-white py-5 px-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 hover:bg-gray-50"><a href="/mdx/first">First Post</a></li>
          <li class="relative bg-white py-5 px-4 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 hover:bg-gray-50"><a href="/mdx/second">Second Post</a></li>
        </ul>
      </div>
    </body>
  );

  const html = renderToString(page);


  return c.html(template(html))
})

app.get('/mdx/:page', async (c) => {
  const page = c.req.param('page')
  if (!posts[page]) {
    return c.html(notFound(), 404)
  }
  const content = posts[page];

  const html = await renderPage(content)
  return c.html(template(html))
})

app.notFound((c) => {
  return c.html(notFound())
})

const notFound = () => (
  template(`
<main class="grid min-h-full place-items-center bg-white py-24 px-6 sm:py-32 lg:px-8">
  <div class="text-center">
    <p class="text-base font-semibold text-indigo-600">404</p>
    <h1 class="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Page not found</h1>
    <p class="mt-6 text-base leading-7 text-gray-600">Sorry, we couldn’t find the page you’re looking for.</p>
    <div class="mt-10 flex items-center justify-center gap-x-6">
      <a href="/mdx" class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Go back home</a>
      <a href="/mdx" class="text-sm font-semibold text-gray-900">Contact support <span aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</main>
`
))

export default app.request