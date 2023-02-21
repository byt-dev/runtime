import { Hono } from 'https://deno.land/x/hono/mod.ts'

const app = new Hono()
app.all('/*', (c) => {
  return c.text('Hello Hono!')
})

export default app.request