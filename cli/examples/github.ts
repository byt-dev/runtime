import { GitHub } from "github";

const s = Secret.get("GITHUB_TOKEN");

const github = new GitHub({
  repo: "byt/runtime",
  token: s,
});

export interface GithubHookProvisionerProps {
  repo: string;
  token: string;
}

export interface GithubHookProvisionerResource {
  url: string;
  name: string;
  description?: string;
}

export interface ProvisinerContext {

}

class GithubHookProvisioner {
  constructor({ repo, token }: GithubHookProvisionerProps) {
    this.repo = repo;
    this.token = token;
  }

  async create(resource: GithubHookProvisionerResource, context: ProvisinerContext) {
    const { data } = await this.client.post("/repos/:repo/hooks", {
      repo: this.repo,
      name: "web",
      config: {
        url: "https://example.com",
      },
    });
    this.hookId = data.id;
  }

  async delete() {
    await this.client.delete("/repos/:repo/hooks/:hookId", {
      repo: this.repo,
      hookId: this.hookId,
    });
  }

  async read() {
    const { data } = await this.client.get("/repos/:repo/hooks/:hookId", {
      repo: this.repo,
      hookId: this.hookId,
    });
    return data;
  }

  async update() {
    await this.client.patch("/repos/:repo/hooks/:hookId", {
      repo: this.repo,
      hookId: this.hookId,
      config: {
        url: "https://example.com",
      },
    });
  }

  async list() {
    const { data } = await this.client.get("/repos/:repo/hooks", {
      repo: this.repo,
    });
    return data;
  }
}

class GitHub {


  constructor({ repo, token }) {
    this.repo = repo;
    this.token = token;
    this.hooks = {};
  }

  hook(event, callback) {
    this.hooks[event] = callback;
  }

  async plan() {
    const { data } = await this.client.get("/repos/:repo", {
      repo: this.repo,
    });
    this.repoId = data.id;
    this.hooks.map { hook =>
    }
    {
      "id": 123456789,
      "github_hook": {
        ""
      }
    }
  }

  async run (event) {
    await this.runHooks();
  }
}

github.hook("push", async (event) => {
  console.log("push event", event);
});

const schedule = new Schedule();

schedule.every("1m").do(async () => {
  await github.poll();

  const diff = Provisioner.plan(github);
  const result = Provisioner.apply(github);
});

export default [
  github,
  schedule
];

