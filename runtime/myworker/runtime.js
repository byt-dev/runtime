((globalThis) => {
  const { core } = Deno[Deno.internal];
  const { ops } = core;

  class Db {
    constructor(namespace) {
      this.namespace = namespace;
    }

    async putItem(key, data) {
      const item = {
        key,
        data,
        namespace: this.namespace
      }
      return ops.op_byt_db_put_item_async(item);
    }

    async getItem(key) {
      return ops.op_byt_db_get_item_async(this.namespace, key).then((result) => {
        console.log({jsonData: result.data})
        return JSON.parse(result.data);
      });
    }
  }

  globalThis.Db = Db;

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
    },
    listFiles: async (path) => {
      return ops.op_byt_files_list_async(path);
    },
  }
})(globalThis);