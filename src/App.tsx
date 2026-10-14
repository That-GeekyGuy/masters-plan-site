import { useCallback, useEffect, useState } from "react";
import { api } from "./filebin/api";
import { SettingsPage } from "./filebin/SettingsPage";
import { UploadPage } from "./filebin/UploadPage";
import { LoginForm, Shell, usePath } from "./filebin/ui";
import PlanApp from "./plan/PlanApp";

type Session = { authed: boolean; configured: boolean } | { error: string };

/**
 * Routes:
 *   /              masters plan (its own client-side gate, unchanged)
 *   /bin           filebin upload + live files   (server-side auth)
 *   /bin/settings  default TTL for new uploads   (server-side auth)
 *   /f/:id     public download — served by a Pages Function, never reaches React
 */
export default function App() {
  const path = usePath();

  const inBin = path === "/bin" || path.startsWith("/bin/");

  useEffect(() => {
    document.title = inBin ? "restricted // filebin" : "restricted // masters-plan";
  }, [inBin]);

  if (!inBin) return <PlanApp />;
  return <Filebin path={path.replace(/\/+$/, "")} />;
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
