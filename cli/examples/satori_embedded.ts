const stari = Byt.service("satori")

export default async () => {
  const html = `
  <img src="https://run.byt.dev/20da6b64-d502-468a-b425-fe8697dd9e7a/satori">
`
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  })
}