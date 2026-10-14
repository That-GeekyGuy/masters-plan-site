import { type Ctx, isAuthed, json } from "../lib";

/**
 * GET /bin/api/session → { authed, configured }
 * While FILEBIN_PASSWORD is missing, also reports which bindings this Worker
 * can see (names only, never values) and the running version id, so a
 * misplaced secret is easy to spot. Disappears once the password is set.
 */
export const onRequestGet = async ({ request, env }: Ctx) => {
  const configured = Boolean(env.FILEBIN_PASSWORD);
  if (configured) return json({ authed: await isAuthed(request, env), configured });
  return json({
    authed: false,
    configured,
    diagnostics: {
      bindingNames: Object.keys(env).sort(),
      passwordBinding: typeof (env as unknown as Record<string, unknown>).FILEBIN_PASSWORD,
      versionId: env.CF_VERSION_METADATA?.id ?? null,
    },
  });
};
