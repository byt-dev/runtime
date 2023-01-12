((globalThis) => {
  const { core } = Deno;
  const { ops } = core;
  // Note: Do not call this when snapshotting, it should be called
  // at runtime. This example does not use V8 snapshots.
  // core.initializeAsyncOps();

  globalThis.rust = {
    helloWorld: () => {
      ops.op_hello_world();
    },
    reverse: (s) => {
      console.log({s})
      return ops.op_hello_reverse(s);
    },
    listBuckets: async () => {
      return await ops.op_aws_s3_list_buckets_async();
    }
  };
})(globalThis);

