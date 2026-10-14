import { useCallback, useEffect, useState } from "react";
import { api } from "./filebin/api";
import { SettingsPage } from "./filebin/SettingsPage";
import { UploadPage } from "./filebin/UploadPage";
import { LoginForm, Shell, usePath } from "./filebin/ui";

type Session = { authed: boolean; configured: boolean } | { error: string };

/**
 * Routes:
 * Everything lives under /bin so it can sit on the main domain as its own page
 * (that-geekyguy.xyz/bin) while the main site keeps every other path.
 *   /bin           upload + live files           (server-side auth)
 *   /bin/settings  default TTL for new uploads   (server-side auth)
 *   /bin/f/:id     public download — served by the Worker (server/), never reaches React
 */
export default function App() {
  const path = usePath().replace(/(.)\/+$/, "$1");
  return <Filebin path={path} />;
}

function Filebin({ path }: { path: string }) {
  const [session, setSession] = useState<Session | null>(null);

  const check = useCallback(() => {
    api
      .session()
      .then(setSession)
      .catch((err: Error) => setSession({ error: err.message }));
  }, []);

  useEffect(check, [check]);

  const lost = useCallback(() => setSession((s) => (s && "authed" in s ? { ...s, authed: false } : s)), []);

  if (!session) return null;
  if ("error" in session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="surface-panel max-w-sm p-6 font-mono text-xs uppercase tracking-widest text-amber">
          {session.error}
        </p>
      </div>
    );
  }
  if (!session.authed) {
    return <LoginForm configured={session.configured} onUnlock={() => setSession({ ...session, authed: true })} />;
  }

  const logout = async () => {
    await api.logout().catch(() => {});
    setSession({ ...session, authed: false });
  };

  return (
    <Shell path={path} onLogout={logout}>
      {path === "/bin/settings" ? <SettingsPage onAuthLost={lost} /> : <UploadPage onAuthLost={lost} />}
    </Shell>
  );
}
