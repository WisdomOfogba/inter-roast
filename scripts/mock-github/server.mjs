// Offline GitHub REST stand-in for local development and E2E tests.
//   npm run mock:github   then   GITHUB_API_BASE_URL=http://localhost:4010 npm run dev
// Users: lena-bytes (rich), empty-octo (no repos), acme-org (organization),
// rate-limited (403 + x-ratelimit-remaining: 0), broken-api (502), anything else → 404.
import http from "node:http";
import { route } from "./fixtures.mjs";

const port = Number(process.env.PORT ?? 4010);
const delay = Number(process.env.MOCK_DELAY_MS ?? 350);
let count = 0; // GET /__stats returns how many API requests were served (for cache tests)

http
  .createServer((req, res) => {
    if (req.url === "/__stats") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ requests: count }));
    }
    count++;
    setTimeout(() => {
      if (req.url === "/graphql") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ data: null }));
      }
      const r = route(req.url ?? "/", String(req.headers.accept ?? ""));
      res.writeHead(r.status, { "content-type": r.text !== undefined ? "text/plain" : "application/json", ...(r.headers ?? {}) });
      res.end(r.text !== undefined ? r.text : JSON.stringify(r.body));
    }, delay);
  })
  .listen(port, () => console.log(`mock GitHub API on http://localhost:${port}`));
