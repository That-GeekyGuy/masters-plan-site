# masters-plan-site

A private **filebin** (upload → share link → auto-expire) at `/bin`, alongside the masters plan at `/`.

Standalone page — the masters-abroad roadmap — styled to match the "Signal Path" interface
from [tech-core-chronicle](https://that-geekyguy.xyz) (same color tokens, same fonts:
Space Grotesk + Inter + IBM Plex Mono) but kept in its own repo on purpose.

**Keep this repo private on GitHub.** The client-side password gate in `src/App.tsx` is a
deterrent, not real security — the actual boundary is this repo not being public. That's the
whole reason this isn't just a page inside `tech-core-chronicle`.

## Local dev

```bash
bun install
bun run dev
```

## Deploy (Cloudflare Workers, subdomain)

Deployed as a **Worker with static assets** via Workers Builds: every push runs
`bun run build` then `npx wrangler deploy`, which reads `wrangler.jsonc`.
Push to `master` → production; other branches → preview versions.

To change the plan's gate password: see the comment at the top of `src/plan/PlanApp.tsx`.

## Filebin

| Route | What | Auth |
|---|---|---|
| `/bin` | Upload (drag/drop, multi-file, progress) + live files with countdowns | server password |
| `/bin/settings` | TTL for new uploads (presets or custom, 1 min – 365 days, or never) + burn-after-read | server password |
| `/` | Masters plan (old client-side gate, unchanged) | client gate |
| `/f/<id>` | Public download link | none — the 128-bit id is the secret |

Backend is a Cloudflare **Worker** (`server/index.ts`, routes in `server/routes/`) on **R2**. The Worker only runs for `/api/*` and `/f/*`; everything else is served straight from `dist/`. All
free-tier: R2 gives 10 GB storage; Cloudflare caps a request body at **100 MB**, so that's the
per-file limit.

How expiry works: each file stores `expiresAt` in its R2 metadata. Downloads check it and refuse
(and delete) expired files, so nothing is served past its TTL. An hourly cron trigger deletes
expired objects, and opening the upload page sweeps too. Optional backstop: add an
R2 lifecycle rule on the `files/` prefix that deletes objects older than your longest TTL.

Security notes:
- The password is checked server-side and never ships in the bundle. Session is an HttpOnly,
  SameSite=Strict, HMAC-signed cookie (30 days). Changing the password signs everyone out.
- Downloads of HTML/SVG/JS/etc. are forced to `attachment` with a sandbox CSP + `nosniff`, so an
  uploaded file can't run script on this origin. Only images, audio/video, PDF and plain text open inline.

### One-time setup

1. **Create the bucket:** Cloudflare dashboard → R2 → Create bucket → name it `filebin`
   (or change `bucket_name` in `wrangler.toml`). Enabling R2 asks for a payment method even on
   the free tier.
2. **Set the password secret:** Workers & Pages → `masters-plan-site` → Settings → Variables and Secrets
   → add `FILEBIN_PASSWORD` as type **Secret**. Use a
   long passphrase — this one *is* real security.
3. Push. `wrangler.jsonc` binds the bucket as `BUCKET`. The deploy fails until the bucket exists.

### Local dev with the API

```bash
echo 'FILEBIN_PASSWORD=dev-password' > .dev.vars   # gitignored
bun run build && bunx wrangler dev                 # http://localhost:8787, local R2 emulation
```

`bun run dev` (plain Vite) still works for UI tweaks, but the API calls will fail without wrangler.
