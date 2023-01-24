import { fromFileUrl, wait, S3Client, PutObjectCommand } from "../deps.ts";
import { parseEntrypoint } from "./utils.ts";
import { bundle } from "https://deno.land/x/emit/mod.ts";

const help = `byt deploy
Deploy a script with static files to byt.
To deploy a local script:
  byt deploy main.ts
To deploy a remote script:
  byt deploy https://deno.com/examples/hello.js
USAGE:
    byt deploy [OPTIONS] <ENTRYPOINT>
OPTIONS:
    -h, --help                Prints help information
`;

export interface Args {
  help: boolean;
}

// deno-lint-ignore no-explicit-any
export default async function (rawArgs: Record<string, any>): Promise<void> {
  const args: Args = {
    help: !!rawArgs.help,
  };
  const entrypoint: string | null = typeof rawArgs._[0] === "string"
    ? rawArgs._[0]
    : null;
  if (args.help) {
    console.log(help);
    Deno.exit(0);
  }
  const token = Deno.env.get("BYT_TOKEN") ?? null;
  if (token === null) {
    console.error(help);
    console.error("Missing access token. Set via --token or BYT_TOKEN.");
    Deno.exit(1);
  }
  if (entrypoint === null) {
    console.error(help);
    console.error("No entrypoint specifier given.");
    Deno.exit(1);
  }
  const opts = {
    entrypoint: await parseEntrypoint(entrypoint).catch((e) => {
      console.error(e);
      Deno.exit(1);
    }),
  };

  await deploy(opts);
}

interface DeployOpts {
  entrypoint: URL;
}

async function deploy(opts: DeployOpts): Promise<void> {
  const bundleSpinner = wait("Bundle...").start();
  let url = opts.entrypoint;
  console.log(url);
  const cwd = Deno.cwd();

  const path = fromFileUrl(url);
  if (!path.startsWith(cwd)) {
    console.error("Entrypoint must be in the current working directory.");
  }

  console.log({path, cwd});

  const result = await bundle(url);
  console.log('after bundle');
  bundleSpinner.succeed(`Bundled ${url}`);

  const deploySpinner = wait("Deploy...").start();
  const s3 = new S3Client({ credentials: {
    accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") ?? "",
    secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "",
    sessionToken: Deno.env.get("AWS_SESSION_TOKEN") ?? "",
  }, region: "eu-central-1" });

  await s3.send(
    new PutObjectCommand({
      Bucket: "cloudspec-sebastian-b0ae2e13-mybucketf68f3ff0-1abymn2e3gw3t",
      Key: "/lambda/index.js",
      Body: result.code,
    }),
  );

  deploySpinner.succeed(`Deployed`);
}