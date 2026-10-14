/// <reference types="@cloudflare/workers-types" />
/**
 * Worker entry, mounted on that-geekyguy.xyz/bin via routes in wrangler.jsonc.
 * Built assets (dist/bin/...) are served by Cloudflare directly; this code runs
 * for /bin/api/*, /bin/f/*, and any /bin path that isn't a file (the app's pages).
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
  ["GET", /^\/bin\/api\/session$/, session],
  ["POST", /^\/bin\/api\/login$/, login],
  ["POST", /^\/bin\/api\/logout$/, logout],
  ["GET", /^\/bin\/api\/settings$/, getSettings],
  ["PUT", /^\/bin\/api\/settings$/, putSettings],
  ["GET", /^\/bin\/api\/files$/, listFiles],
  ["PUT", /^\/bin\/api\/files$/, uploadFile],
  ["DELETE", /^\/bin\/api\/files\/(?<id>[^/]+)$/, deleteFile],
  ["GET", /^\/bin\/f\/(?<id>[^/]+)$/, download],
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
    if (pathname.startsWith("/bin/api/")) return error(404, "No such endpoint.");
    if (pathname.startsWith("/bin/assets/")) return new Response("Not found", { status: 404 });
    // Page routes (/bin, /bin/settings, ...) all get the app shell; React picks the page.
    if (request.method === "GET" && (pathname === "/bin" || pathname.startsWith("/bin/"))) {
      return env.ASSETS.fetch(new Request(new URL("/bin/index.html", request.url), request));
    }
    // Only reachable on this Worker's own workers.dev URL — the main domain routes only /bin here.
    return Response.redirect(new URL("/bin", request.url).toString(), 302);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sweepExpired(env).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
