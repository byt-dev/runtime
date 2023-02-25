export default async () => {
  const html = `
  <img src="https://skorfmann.run.byt.dev/satori_storage">
`
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  })
}