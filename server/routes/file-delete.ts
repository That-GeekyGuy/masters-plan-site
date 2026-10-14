import { type Ctx, FILE_PREFIX, ID_RE, error, json, requireAuth } from "../lib";

/** DELETE /api/files/:id */
export const onRequestDelete = requireAuth(async ({ params, env }: Ctx) => {
  const id = String(params.id);
  if (!ID_RE.test(id)) return error(404, "Not found.");
  await env.BUCKET.delete(FILE_PREFIX + id);
  return json({ ok: true });
});
