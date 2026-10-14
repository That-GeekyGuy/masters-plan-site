/// <reference types="@cloudflare/workers-types" />
/**
 * Worker entry. Static assets (the Vite build in dist/) are served by
 * Cloudflare directly; only /api/* and /f/* reach this code (see
 * run_worker_first in wrangler.jsonc).
 */
import { type Ctx, type Env, error, sweepExpired } from "./lib";
import { onRequestGet as download } from "./routes/download";
import { onRequestDelete as deleteFile } from "./routes/file-delete";
import { onRequestGet as listFiles, onRequestPut as uploadFile } from "./routes/files";
import { onRequestPost as login } from "./routes/login";
import { onRequestPost as logout } from "./routes/logout";
import { onRequestGet as session } from "./routes/session";
import { onRequestGet as getSettings, onRequestPut as putSettings } from "./routes/settings";

type Handler = (ctx: Ctx) => Promise<Response> | Response;

const ROUTES: [method: string, pattern: RegExp, handler: Handler][] = [
  ["GET", /^\/api\/session$/, session],
  ["POST", /^\/api\/login$/, login],
  ["POST", /^\/api\/logout$/, logout],
  ["GET", /^\/api\/settings$/, getSettings],
  ["PUT", /^\/api\/settings$/, putSettings],
  ["GET", /^\/api\/files$/, listFiles],
  ["PUT", /^\/api\/files$/, uploadFile],
  ["DELETE", /^\/api\/files\/(?<id>[^/]+)$/, deleteFile],
  ["GET", /^\/f\/(?<id>[^/]+)$/, download],
];

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    let pathMatched = false;
    for (const [method, pattern, handler] of ROUTES) {
      const m = pattern.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      if (method === request.method) return handler({ request, env, params: { ...m.groups } });
    }
    if (pathMatched) return error(405, "Method not allowed.");
    if (pathname.startsWith("/api/")) return error(404, "No such endpoint.");
    return env.ASSETS.fetch(request);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sweepExpired(env).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
