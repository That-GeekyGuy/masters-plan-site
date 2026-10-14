import {
  type Ctx,
  FILE_PREFIX,
  type FileMeta,
  error,
  json,
  newId,
  readSettings,
  requireAuth,
  sanitizeName,
  sweepExpired,
} from "../lib";

/** Cloudflare's free plan caps a request body at 100 MB. */
const MAX_BYTES = 100 * 1024 * 1024;

/** GET /api/files → live files (expired ones are deleted as a side effect) */
export const onRequestGet = requireAuth(async ({ env }: Ctx) => {
  const live = await sweepExpired(env);
  const files = live
    .map((o) => {
      const m = o.customMetadata as unknown as FileMeta;
      return {
        id: o.key.slice(FILE_PREFIX.length),
        name: m.name,
        size: o.size,
        type: o.httpMetadata?.contentType ?? "application/octet-stream",
        uploadedAt: Number(m.uploadedAt),
        expiresAt: Number(m.expiresAt) || null,
        burnAfterRead: m.burn === "1",
      };
    })
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
  return json({ files });
});

/**
 * PUT /api/files  (raw file bytes as the body)
 * Headers: x-filename (URI-encoded), content-type, content-length
 * The TTL comes from the saved settings, not the client.
 */
export const onRequestPut = requireAuth(async ({ request, env }: Ctx) => {
  const length = Number(request.headers.get("content-length"));
  if (!request.body || !Number.isFinite(length) || length <= 0) {
    return error(411, "Upload needs a non-empty body with a Content-Length.");
  }
  if (length > MAX_BYTES) return error(413, "File is larger than 100 MB.");

  const settings = await readSettings(env);
  const now = Date.now();
  const id = newId();
  const meta: FileMeta = {
    name: sanitizeName(request.headers.get("x-filename")),
    uploadedAt: String(now),
    expiresAt: settings.ttlSeconds ? String(now + settings.ttlSeconds * 1000) : "0",
    burn: settings.burnAfterRead ? "1" : "0",
  };

  await env.BUCKET.put(FILE_PREFIX + id, request.body, {
    httpMetadata: { contentType: request.headers.get("content-type") || "application/octet-stream" },
    customMetadata: { ...meta },
  });

  return json(
    {
      id,
      name: meta.name,
      size: length,
      url: `${new URL(request.url).origin}/f/${id}`,
      expiresAt: Number(meta.expiresAt) || null,
      burnAfterRead: settings.burnAfterRead,
    },
    { status: 201 },
  );
});
