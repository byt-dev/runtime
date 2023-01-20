((globalThis) => {
  const { core } = Deno;
  const { ops } = core;

  globalThis.rust = {
    reverse: (s) => {
      console.log({s})
      return ops.op_hello_reverse(s);
    },
    listBuckets: async () => {
      return await ops.op_aws_s3_list_buckets_async();
    }
  }
})(globalThis);