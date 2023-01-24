// Inpsired by https://github.com/denoland/deployctl/blob/fd713ff04fd5db656e0633c636880d0c61fecca5/deps.ts

// std
export {
  fromFileUrl,
  join,
  normalize,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.170.0/path/mod.ts";
export {
  bold,
  green,
  red,
  yellow,
} from "https://deno.land/std@0.170.0/fmt/colors.ts";
export { parse as parseArgs } from "https://deno.land/std@0.170.0/flags/mod.ts";
export { TextLineStream } from "https://deno.land/std@0.170.0/streams/text_line_stream.ts";

// x/semver
export {
  gte as semverGreaterThanOrEquals,
  valid as semverValid,
} from "https://deno.land/std@0.170.0/semver/mod.ts";

// x/wait
export { Spinner, wait } from "https://deno.land/x/wait@0.1.12/mod.ts";

export {
  PutObjectCommand,
  S3Client,
} from "https://esm.sh/@aws-sdk/client-s3@3.245.0";