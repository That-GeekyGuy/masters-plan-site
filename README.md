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

## Deploy (Cloudflare Pages, subdomain)

1. Push this repo to a **private** GitHub repo.
2. Cloudflare dashboard → Workers & Pages → Create → connect this repo.
   - Build command: `bun run build` (or `npm run build`)
   - Build output directory: `dist`
3. Once deployed, add a custom domain on the Pages project: `ops.that-geekyguy.xyz` (or whatever
   subdomain you want) → Cloudflare adds the CNAME automatically since the zone is already yours.
4. To change the gate password: see the comment at the top of `src/App.tsx`.

## Filebin

| Route | What | Auth |
|---|---|---|
| `/bin` | Upload (drag/drop, multi-file, progress) + live files with countdowns | server password |
| `/bin/settings` | TTL for new uploads (presets or custom, 1 min – 365 days, or never) + burn-after-read | server password |
| `/` | Masters plan (old client-side gate, unchanged) | client gate |
| `/f/<id>` | Public download link | none — the 128-bit id is the secret |

Backend is Cloudflare **Pages Functions** (`functions/`, helpers in `server/`) on **R2**. All
free-tier: R2 gives 10 GB storage; Cloudflare caps a request body at **100 MB**, so that's the
per-file limit.

How expiry works: each file stores `expiresAt` in its R2 metadata. Downloads check it and refuse
(and delete) expired files, so nothing is served past its TTL. Pages Functions can't run on a cron,
so leftover expired objects are swept whenever you open the upload page. Optional backstop: add an
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
2. **Set the password secret:** Workers & Pages → this project → Settings → Variables and Secrets
   → add `FILEBIN_PASSWORD` as a **Secret** (Production, and Preview if you use previews). Use a
   long passphrase — this one *is* real security.
3. Push. `wrangler.toml` binds the bucket as `BUCKET`; Pages picks it up on the next deploy.

### Local dev with the API

```bash
echo 'FILEBIN_PASSWORD=dev-password' > .dev.vars   # gitignored
bun run build && bunx wrangler pages dev dist      # http://localhost:8788, local R2 emulation
```

`bun run dev` (plain Vite) still works for UI tweaks, but the API calls will fail without wrangler.
