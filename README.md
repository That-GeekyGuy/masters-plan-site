# masters-plan-site

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
