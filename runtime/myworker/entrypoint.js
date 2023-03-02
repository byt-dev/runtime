import mod from "/usercode.ts"

const resolve = async (request) => {
  if (request.type === "bindings" && mod.bindings && Array.isArray(mod.bindings)) {
    for (let binding of mod.bindings) {
      if (binding.namespace === request.namespace && binding.type === request.bindingType) {
        return await binding.dispatch(request.event, request.data)
      }
    }
  } else if (mod && typeof mod === "function") {
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
}

export default resolve