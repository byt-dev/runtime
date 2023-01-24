#!/bin/bash

docker run --rm \
    -v ${PWD}:/code \
    -v ${HOME}/.cargo/registry:/cargo/registry \
    -v ${HOME}/.cargo/git:/cargo/git \
    -w /code/cloud/constructs/rust-runtime \
    -e RUST_BACKTRACE=1 \
    rustserverless/lambda-rust