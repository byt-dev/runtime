- https://github.com/awslabs/aws-lambda-rust-runtime
- https://docs.aws.amazon.com/sdk-for-rust/latest/dg/lambda.html
- https://dev.to/ryands17/rust-on-lambda-using-the-cdk-3ccm
- https://words.filippo.io/easy-windows-and-linux-cross-compilers-for-macos/
- https://burgers.io/cross-compile-rust-from-arm-to-x86-64
- https://github.com/denoland/deno/issues/13458
- https://choubey.gitbook.io/internals-of-deno/import-and-ops/5.6-registration-of-ops
- https://github.com/ddprrt/lambda-hyper-example-workspace/blob/main/lambda/src/
- https://github.com/awslabs/aws-lambda-rust-runtime/discussions/405
- https://github.com/awslabs/aws-lambda-rust-runtime/issues/317#issuecomment-916226693
- https://github.com/awslabs/aws-lambda-rust-runtime/issues/310
lambda_event_layer.rs

```
rustup target add x86_64-unknown-linux-musl
```

Fix for

```
error: linking with `cc` failed: exit status: 1
note: ld: unknown option: --as-needed
```

```
brew install filosottile/musl-cross/musl-cross
```

```
# .cargo/config

[target.x86_64-unknown-linux-musl]
linker = "x86_64-linux-musl-gcc"
```

