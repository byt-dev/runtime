# Cloud Runtime

Based on the Deno Runtime and tailored for the AWS Serverless ecosystem.

## Contributing

We'd love you to contribute in every way you can imagine. Starting by just using it, providing feedback, submitting examples, feature requests, writing some docs, spreading the word or writing some code. In case you're aiming to write some code, these are the steps to get you going:

- You'll need a working up2date rust setup
- Make sure to setup the custom Deno fork as described below
- Build the AWS Lambda runtime as described below
- Deploy the [./cloud](./cloud/) AWS CDK part to your AWS account
- Edit the [default config](./cli/src/config.rs) values with the outputs of the CDK deployment. Also see [this issue](https://github.com/byt-dev/runtime/issues/8) to make this easier
- Build the project via `cargo build` to get a custom build of the [./cli](./cli/)
- Use the built CLI via the `./target/debug/byt`

### Custom Deno Fork

For reasons, you'll need a custom Deno fork checked out alongside this projects folder. This is a gigantic hack and will go away. It allows using the bundling logic from the Deno CLI.

The folder structure we're aiming for:

```
ls -l
- deno
- runtime
```

The Deno fork can be obtained like this. Run the following commands in the parent folder of this project folder.

```
git clone https://github.com/skorfmann/deno.git
cd deno
git checkout rust-cli
cd ../runtime
cargo build
```

With that it should be possible to build the entire project


### Build the AWS Lambda Runtime artifact

The AWS Lambda adapter can be found here [./cloud/constructs/rust-runtime/](./cloud/constructs/rust-runtime) and needs a special build step. It needs to be built with a `x86_64-unknown-linux-musl` target, which caused lots of problems when trying to cross-compile this from macOS around the [rusty-v8](https://github.com/denoland/rusty_v8) crate. So, the build needs to be done via [Docker](https://github.com/awslabs/aws-lambda-rust-runtime/#25-docker) to work reliably across platforms. This build might take a couple of minutes depending on your hardware.

The following command needs to be run from the root directory of the project:

```
  docker run --rm \
    -v ${PWD}:/code \
    -v ${PWD}/../deno:/deno \
    -v ${HOME}/.cargo/registry:/cargo/registry \
    -v ${HOME}/.cargo/git:/cargo/git \
    -w /code/cloud/constructs/rust-runtime \
    -e RUST_BACKTRACE=1 \
    rustserverless/lambda-rust
```

Once that's finished, you can continue with the actual CDK deployment in the `./cloud` directory.

## Credits

Inspired by

- https://github.com/denoland/roll-your-own-javascript-runtime/
- https://github.com/denoland/deno/tree/a6b3910bdfe0183e458015d00a61295779e46eb1/runtime/examples
- https://github.com/bartlomieju/eslint_binary/