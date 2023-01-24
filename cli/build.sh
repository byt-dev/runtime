#!/bin/sh
# Build the CLI
set -e

deno run --allow-all build.ts
deno compile --allow-all --no-check --output byt ./dist/byt.esm.js