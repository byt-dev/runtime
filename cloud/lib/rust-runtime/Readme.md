- https://github.com/awslabs/aws-lambda-rust-runtime
- https://docs.aws.amazon.com/sdk-for-rust/latest/dg/lambda.html
- https://dev.to/ryands17/rust-on-lambda-using-the-cdk-3ccm
- https://words.filippo.io/easy-windows-and-linux-cross-compilers-for-macos/
- https://burgers.io/cross-compile-rust-from-arm-to-x86-64

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

