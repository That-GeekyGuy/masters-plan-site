import { type Ctx, isAuthed, json } from "../lib";

/** GET /api/session → { authed, configured } */
export const onRequestGet = async ({ request, env }: Ctx) =>
  json({ authed: await isAuthed(request, env), configured: Boolean(env.FILEBIN_PASSWORD) });
