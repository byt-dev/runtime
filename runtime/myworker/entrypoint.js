import mod from "/usercode.ts"

const resolve = async (request) => {
  let response = await mod(request)
  let body = await response.body.getReader().read();
  let headers = {}
  for (let [key, value] of response.headers) {
    headers[key] = value
  }

  return {
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    redirected: response.redirected,
    ok: response.ok,
    headers,
    body: body.value
  }
}

export default resolve