import { parseArgs } from "./deps.ts";
import deploySubcommand from "./src/deploy.ts";

const VERSION="0.1.0"

const help = `byt ${VERSION}
Command line tool for byt.dev
To deploy a local script:
  byt deploy --project=helloworld ./main.ts
To deploy a remote script:
  byt deploy --project=helloworld https://deno.land/x/deploy/examples/hello.js
SUBCOMMANDS:
    login     Login to byt.dev
    deploy    Deploy a script to byt.dev
    logs      Stream logs
`;

const args = parseArgs(Deno.args, {
  alias: {
    "help": "h",
    "version": "V",
  },
  boolean: [
    "help",
    "version",
  ],
  string: [
    "token",
  ],
  default: {
    static: true,
  },
});


const subcommand = args._.shift();
switch (subcommand) {
  case "deploy":
    await deploySubcommand(args);
    break;
  default:
    if (args.version) {
      console.log(`deployctl ${VERSION}`);
      Deno.exit(0);
    }
    if (args.help) {
      console.log(help);
      Deno.exit(0);
    }
    console.error(help);
    Deno.exit(1);
}