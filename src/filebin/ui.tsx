import { useEffect, useState, type AnchorHTMLAttributes, type FormEvent, type ReactNode } from "react";
import { api } from "./api";

/* ---------------- tiny router ---------------- */

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

export function navigate(to: string) {
  if (to === window.location.pathname) return;
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function Link({ href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    />
  );
}

/* ---------------- shared bits ---------------- */

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-primary px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground transition-transform active:scale-95 disabled:opacity-60";
export const btnGhost =
  "mono-label inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-foreground transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50";
export const inputCls =
  "w-full border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary/60";

const NAV = [
  { href: "/bin", code: "UP", label: "Upload" },
  { href: "/bin/settings", code: "TTL", label: "Settings" },
  { href: "/", code: "MP", label: "Plan" },
];

export function Shell({
  path,
  onLogout,
  children,
}: {
  path: string;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pcb-grid pointer-events-none fixed inset-0 z-0 opacity-30" aria-hidden />
      <nav className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="container-tight flex max-w-4xl items-center gap-1.5 py-2.5">
          <span className="mono-label mr-3 hidden text-primary sm:inline">// FILEBIN</span>
          <ul className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {NAV.map((n) => {
              const active = path === n.href;
              return (
                <li key={n.href} className="shrink-0">
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`${btnGhost} ${active ? "border-primary/60 text-primary" : ""}`}
                  >
                    <span className="text-primary">{n.code}</span>
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={onLogout} className={`${btnGhost} ml-auto shrink-0`}>
            Lock
          </button>
        </div>
      </nav>
      <main className="container-tight relative z-10 max-w-4xl py-14 md:py-20">{children}</main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-10">
      <p className="mono-label text-primary">{eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tighter text-foreground md:text-5xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{children}</div>}
    </header>
  );
}

/* ---------------- login ---------------- */

export function LoginForm({ configured, onUnlock }: { configured: boolean; onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(value);
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="pcb-grid pointer-events-none fixed inset-0 z-0 opacity-40" aria-hidden />
      <form onSubmit={onSubmit} className="surface-panel relative z-10 w-full max-w-sm p-6 md:p-8">
        <p className="mono-label text-primary">// RESTRICTED_NODE · FILEBIN</p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">Access gated.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {configured
            ? "Enter the key to continue. Checked on the server."
            : "No FILEBIN_PASSWORD secret is set on the Cloudflare project yet."}
        </p>
        <input
          type="password"
          autoFocus
          value={value}
          disabled={!configured}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          className={`mt-5 ${inputCls}`}
          placeholder="passphrase"
          aria-label="Passphrase"
        />
        {error && <p className="mt-2 font-mono text-xs uppercase tracking-widest text-amber">{error}</p>}
        <button type="submit" disabled={busy || !configured || !value} className={`mt-4 w-full ${btnPrimary}`}>
          {busy ? "Verifying…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
