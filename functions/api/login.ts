import { type Ctx, error, isSecure, json, passwordMatches, sessionCookie } from "../../server/lib";

/** POST /api/login  { password } → sets an HttpOnly session cookie */
export const onRequestPost = async ({ request, env }: Ctx) => {
  if (!env.FILEBIN_PASSWORD) return error(500, "FILEBIN_PASSWORD secret is not set.");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return error(403, "Cross-origin request blocked.");

  let password = "";
  try {
    password = String(((await request.json()) as { password?: unknown }).password ?? "");
  } catch {
    return error(400, "Expected JSON body.");
  }
  if (!(await passwordMatches(env, password))) {
    // Small fixed delay makes online guessing slower.
    await new Promise((r) => setTimeout(r, 750));
    return error(401, "Wrong password.");
  }
  return json(
    { ok: true },
    { headers: { "set-cookie": await sessionCookie(env, isSecure(request)) } },
  );
};
