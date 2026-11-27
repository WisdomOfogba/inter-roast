/**
 * Fictional GitHub fixtures in the real REST response shapes. Used by the test
 * suite and by `npm run mock:github` for offline development. No real people.
 */
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");

function repo(name, o = {}) {
  return {
    name,
    full_name: `lena-bytes/${name}`,
    html_url: `https://github.com/lena-bytes/${name}`,
    description: o.description ?? null,
    fork: o.fork ?? false,
    archived: false,
    language: o.language ?? null,
    stargazers_count: o.stars ?? 0,
    forks_count: o.forks ?? 0,
    open_issues_count: 0,
    topics: o.topics ?? [],
    created_at: iso(o.created ?? 900),
    updated_at: iso(o.pushed ?? 30),
    pushed_at: iso(o.pushed ?? 30),
    homepage: o.homepage ?? null,
    size: o.size ?? 240,
    license: o.license ? { key: "mit", spdx_id: "MIT" } : null,
  };
}

export const USERS = {
  "lena-bytes": {
    user: {
      login: "lena-bytes", id: 99000001, type: "User", name: "Lena Bytes",
      bio: "Full-stack dev. Building the next big thing (again).",
      avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
      html_url: "https://github.com/lena-bytes", followers: 37, following: 212,
      public_repos: 23, public_gists: 2, created_at: iso(2400),
    },
    repos: [
      repo("todo-app-final-v2", { language: "JavaScript", pushed: 3, created: 40, description: "My todo app" }),
      repo("portfolio", { language: "TypeScript", pushed: 9, stars: 2, homepage: "https://example.dev", topics: ["nextjs", "portfolio"] }),
      repo("crypto-tracker", { language: "TypeScript", pushed: 60, stars: 1 }),
      repo("weather-app", { language: "JavaScript", pushed: 420, description: null }),
      repo("devlog", { language: "Go", pushed: 500, stars: 0 }),
      repo("rust-playground", { language: "Rust", pushed: 610 }),
      repo("ml-notebooks", { language: "Jupyter Notebook", pushed: 700, stars: 3 }),
      repo("flutter-shop", { language: "Dart", pushed: 800 }),
      repo("chat-app-socketio", { language: "JavaScript", pushed: 860, description: "real time chat" }),
      repo("test", { language: "HTML", pushed: 1100, size: 3 }),
      repo("snippetbox", { language: "Go", pushed: 1200, stars: 412, forks: 57, description: "A tiny, fast snippet manager for the terminal", topics: ["cli", "go", "productivity"], license: true }),
      repo("react-course", { language: "JavaScript", pushed: 1300 }),
      repo("awesome-react", { fork: true, language: null, pushed: 1400 }),
      repo("linux", { fork: true, language: "C", pushed: 1500 }),
      repo("vue-dashboard", { language: "Vue", pushed: 1600 }),
      repo("project1", { language: "Python", pushed: 1700 }),
    ],
    readmes: {
      "snippetbox": "# snippetbox\n\n![build](https://img.shields.io/badge/build-passing-green)\n\nA tiny, fast snippet manager for the terminal.\n\n## Install\n\n```\ngo install github.com/lena-bytes/snippetbox@latest\n```\n\n## Usage\n\n```\nsnip add 'docker ps -a'\n```\n\nWorks offline, stores everything in a single file.",
      "todo-app-final-v2": "# Getting Started with Create React App\n\nThis project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).\n\n## Available Scripts\n\nIn the project directory, you can run:\n\n### `npm start`",
      "portfolio": "# portfolio\nmy site",
      "ml-notebooks": null,
      "crypto-tracker": null,
    },
    commits: {
      "todo-app-final-v2": ["update", "fix", "final fix", "wip", "update"],
      "portfolio": ["Add dark mode toggle", "update readme.md", "changes"],
    },
    events: [
      ...Array.from({ length: 12 }, (_, i) => ({ type: "PushEvent", created_at: iso(3 + i * 2), repo: { name: "lena-bytes/todo-app-final-v2" } })),
      { type: "CreateEvent", created_at: iso(40), repo: { name: "lena-bytes/todo-app-final-v2" } },
      { type: "WatchEvent", created_at: iso(12), repo: { name: "someone/cool-lib" } },
      { type: "WatchEvent", created_at: iso(13), repo: { name: "someone/other-lib" } },
      { type: "ForkEvent", created_at: iso(20), repo: { name: "someone/awesome-list" } },
    ],
  },
  "empty-octo": {
    user: {
      login: "empty-octo", id: 99000002, type: "User", name: null, bio: null,
      avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
      html_url: "https://github.com/empty-octo", followers: 0, following: 3,
      public_repos: 0, public_gists: 0, created_at: iso(800),
    },
    repos: [], readmes: {}, commits: {}, events: [],
  },
  "acme-org": {
    user: {
      login: "acme-org", id: 99000003, type: "Organization", name: "Acme",
      bio: null, avatar_url: "https://avatars.githubusercontent.com/u/583231?v=4",
      html_url: "https://github.com/acme-org", followers: 10, following: 0,
      public_repos: 4, public_gists: 0, created_at: iso(1000),
    },
    repos: [], readmes: {}, commits: {}, events: [],
  },
};

/** Route a GitHub REST path to a fixture response: { status, body, headers }. */
export function route(path, accept = "") {
  const url = new URL(path, "http://x");
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts[0] === "users" && parts[1] === "rate-limited") {
    return { status: 403, body: { message: "API rate limit exceeded" }, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 1800) } };
  }
  // The app's own repo (nav star button). Placeholder count for local screenshots only.
  if (url.pathname.toLowerCase() === "/repos/wisdomofogba/repo-riote") return { status: 200, body: { full_name: "WisdomOfogba/repo-riote", stargazers_count: 128 } };
  if (parts[0] === "users" && parts[1] === "broken-api") return { status: 502, body: { message: "Bad gateway" } };

  if (parts[0] === "users") {
    const u = USERS[parts[1]?.toLowerCase()];
    if (!u) return { status: 404, body: { message: "Not Found" } };
    if (parts.length === 2) return { status: 200, body: u.user };
    if (parts[2] === "repos") return { status: 200, body: u.repos };
    if (parts[2] === "events") return { status: 200, body: u.events };
  }
  if (parts[0] === "repos") {
    const u = USERS[parts[1]?.toLowerCase()];
    const name = parts[2];
    if (!u || !u.repos.some((r) => r.name === name)) return { status: 404, body: { message: "Not Found" } };
    if (parts[3] === "readme") {
      const md = u.readmes[name];
      if (!md) return { status: 404, body: { message: "Not Found" } };
      return accept.includes("raw") ? { status: 200, text: md } : { status: 200, body: { name: "README.md", encoding: "base64", content: Buffer.from(md).toString("base64") } };
    }
    if (parts[3] === "commits") {
      const msgs = u.commits[name] ?? [];
      return { status: 200, body: msgs.map((m, i) => ({ sha: `${name}-${i}`.padEnd(40, "0"), commit: { message: m, author: { date: iso(3 + i) } } })) };
    }
  }
  return { status: 404, body: { message: "Not Found" } };
}

/** A fetch() stand-in backed by the fixtures (for unit tests). */
export function fixtureFetch(calls = []) {
  return async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    calls.push(path);
    const accept = (init.headers && (init.headers.Accept || init.headers.accept)) || "";
    const r = route(path, accept);
    const headers = new Headers(r.headers ?? {});
    if (r.text !== undefined) return new Response(r.text, { status: r.status, headers });
    headers.set("content-type", "application/json");
    return new Response(JSON.stringify(r.body), { status: r.status, headers });
  };
}
