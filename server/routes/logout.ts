import { type Ctx, clearCookie, isSecure, json } from "../lib";

/** POST /api/logout → clears the session cookie */
export const onRequestPost = async ({ request }: Ctx) =>
  json({ ok: true }, { headers: { "set-cookie": clearCookie(isSecure(request)) } });
