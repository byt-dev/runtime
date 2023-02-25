((globalThis) => {
  const { core } = Deno[Deno.internal];
  const { ops } = core;

  globalThis.byt = {
    getEvent: async () => {
      return await ops.op_byt_get_event_async();
    },
    getContext: async () => {
      return await ops.op_byt_get_context_async();
    },
    getFile: async (path) => {
      return ops.op_byt_files_get_async(path).then((result) => {
        return new Uint8Array(result);
      });
    }
  }
})(globalThis);