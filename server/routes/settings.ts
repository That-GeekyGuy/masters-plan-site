import {
  type Ctx,
  MAX_TTL_SECONDS,
  MIN_TTL_SECONDS,
  SETTINGS_KEY,
  error,
  json,
  readSettings,
  requireAuth,
  validateSettings,
} from "../lib";

const limits = { minTtlSeconds: MIN_TTL_SECONDS, maxTtlSeconds: MAX_TTL_SECONDS };

/** GET /api/settings → current TTL settings */
export const onRequestGet = requireAuth(async ({ env }: Ctx) =>
  json({ settings: await readSettings(env), limits }),
);

/** PUT /api/settings  { ttlSeconds, burnAfterRead } — applies to future uploads only */
export const onRequestPut = requireAuth(async ({ request, env }: Ctx) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error(400, "Expected JSON body.");
  }
  const result = validateSettings(body);
  if (typeof result === "string") return error(400, result);
  await env.BUCKET.put(SETTINGS_KEY, JSON.stringify(result), {
    httpMetadata: { contentType: "application/json" },
  });
  return json({ settings: result, limits });
});
