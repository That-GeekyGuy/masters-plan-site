# masters-plan-site → filebin

A private **filebin** at **that-geekyguy.xyz/bin**: upload a file, get a share link, and it deletes
itself when its TTL runs out. The main site (separate repo) keeps every other path on the domain.
Styled with the "Signal Path" tokens from [tech-core-chronicle](https://that-geekyguy.xyz)
(Space Grotesk + Inter + IBM Plex Mono).

| Route | What | Auth |
|---|---|---|
| `/bin` | Upload (drag/drop, multi-file, progress) + live files with countdowns | password |
| `/bin/settings` | TTL for new uploads (presets or custom, 1 min – 365 days, or never) + burn-after-read | password |
| `/bin/f/<id>` | Public download link | none — the 128-bit random id is the secret |

## How it works

- **Frontend:** Vite + React in `src/`, built to `dist/bin/` (base path `/bin/`).
- **Routing:** `wrangler.jsonc` attaches this Worker to the routes `that-geekyguy.xyz/bin` and
  `that-geekyguy.xyz/bin/*`. A route runs ahead of the main site's Worker, so only `/bin` comes here.
- **Backend:** the Worker (`server/index.ts`, routes in `server/routes/`) handles `/bin/api/*`,
  `/bin/f/*` and page paths; built files under `/bin/assets/` are served straight from `dist/`.
- **Storage:** R2 bucket `filebin`. First 10 GB free, then about $0.015/GB-month; downloads are
  free. Per-file limit is 100 MB (Cloudflare's request-size cap on the free plan).
- **Expiry:** each file records `expiresAt`. Downloads refuse and delete expired files, so nothing is
  served past its TTL. An hourly cron trigger and opening the upload page both sweep leftovers.

Security:
- The password is checked on the server and never ships in the bundle. Sessions are an HttpOnly,
  SameSite=Strict, HMAC-signed cookie (30 days). Changing the password signs everyone out.
- HTML/SVG/JS and other risky types always download as attachments with a sandbox CSP and
  `nosniff`, so an uploaded file can't run script on this site. Images, audio/video, PDF and plain
  text open in the browser.

## One-time setup

1. **R2 bucket:** dashboard → R2 → Create bucket → name `filebin`, location hint Asia-Pacific,
   storage class Standard. Leave public access, CORS and lifecycle rules off.
2. **Password:** Workers & Pages → `masters-plan-site` → Settings → Variables and Secrets → add
   `FILEBIN_PASSWORD` as type **Secret**. Use a long passphrase.
3. Push. Workers Builds runs `bun run build` then `npx wrangler deploy`, which reads `wrangler.jsonc`
   and creates the `/bin` routes on the `that-geekyguy.xyz` zone.

## Local dev

```bash
bun install
echo 'FILEBIN_PASSWORD=dev-password' > .dev.vars   # gitignored
bun run build && bunx wrangler dev                 # http://localhost:8787/bin, local R2 emulation
```

`bun run dev` (plain Vite) works for UI-only tweaks, but API calls fail without wrangler.
