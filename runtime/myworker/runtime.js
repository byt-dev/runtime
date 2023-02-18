((globalThis) => {
  const { core } = Deno[Deno.internal];
  const { ops } = core;

  globalThis.byt = {
    getEvent: async () => {
      return await ops.op_byt_get_event_async();
    },
    getContext: async () => {
      return await ops.op_byt_get_context_async();
    }
  }
})(globalThis);