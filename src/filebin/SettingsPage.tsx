import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, type Limits, type Settings, api, formatDuration } from "./api";
import { Link, PageHeader, btnGhost, btnPrimary, inputCls } from "./ui";

const UNITS = [
  { id: "m", label: "minutes", seconds: 60 },
  { id: "h", label: "hours", seconds: 3600 },
  { id: "d", label: "days", seconds: 86400 },
] as const;
type Unit = (typeof UNITS)[number]["id"];

const PRESETS: { label: string; seconds: number }[] = [
  { label: "10 min", seconds: 600 },
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86400 },
  { label: "7 days", seconds: 604800 },
  { label: "30 days", seconds: 2592000 },
  { label: "Never", seconds: 0 },
];

/** Express seconds in the largest unit that divides it evenly. */
function split(seconds: number): { amount: number; unit: Unit } {
  for (const u of [...UNITS].reverse()) {
    if (seconds > 0 && seconds % u.seconds === 0) return { amount: seconds / u.seconds, unit: u.id };
  }
  return { amount: Math.max(1, Math.round(seconds / 60)), unit: "m" };
}

export function SettingsPage({ onAuthLost }: { onAuthLost: () => void }) {
  const [saved, setSaved] = useState<Settings | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [never, setNever] = useState(false);
  const [amount, setAmount] = useState("1");
  const [unit, setUnit] = useState<Unit>("d");
  const [burn, setBurn] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = (s: Settings, l: Limits) => {
    setSaved(s);
    setLimits(l);
    setNever(s.ttlSeconds === 0);
    if (s.ttlSeconds > 0) {
      const { amount, unit } = split(s.ttlSeconds);
      setAmount(String(amount));
      setUnit(unit);
    }
    setBurn(s.burnAfterRead);
  };

  useEffect(() => {
    api
      .getSettings()
      .then(({ settings, limits }) => load(settings, limits))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) onAuthLost();
        setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Couldn't load settings." });
      });
  }, [onAuthLost]);

  const ttlSeconds = useMemo(() => {
    if (never) return 0;
    const n = Number(amount);
    const u = UNITS.find((x) => x.id === unit)!;
    return Number.isFinite(n) && n > 0 ? Math.round(n * u.seconds) : NaN;
  }, [never, amount, unit]);

  const validationError = useMemo(() => {
    if (!limits || never) return null;
    if (!Number.isFinite(ttlSeconds)) return "Enter a positive number.";
    if (ttlSeconds < limits.minTtlSeconds) return `Minimum is ${formatDuration(limits.minTtlSeconds)}.`;
    if (ttlSeconds > limits.maxTtlSeconds) return `Maximum is ${formatDuration(limits.maxTtlSeconds)}.`;
    return null;
  }, [limits, never, ttlSeconds]);

  const dirty = saved !== null && (saved.ttlSeconds !== ttlSeconds || saved.burnAfterRead !== burn);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await api.saveSettings({ ttlSeconds, burnAfterRead: burn });
      load(res.settings, res.limits);
      setStatus({ kind: "ok", msg: "Saved. New uploads use this TTL." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onAuthLost();
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (seconds: number) => {
    setStatus(null);
    if (seconds === 0) return setNever(true);
    setNever(false);
    const s = split(seconds);
    setAmount(String(s.amount));
    setUnit(s.unit);
  };

  return (
    <>
      <PageHeader eyebrow="// OPS · FILEBIN · TTL" title="How long files live.">
        Applies to every upload from now on. Files already uploaded keep the expiry they were given.
      </PageHeader>

      <form onSubmit={onSubmit} className="surface-panel space-y-8 p-6 md:p-8">
        <fieldset disabled={!saved}>
          <legend className="mono-label mb-3 text-primary">Presets</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active = p.seconds === 0 ? never : !never && ttlSeconds === p.seconds;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.seconds)}
                  aria-pressed={active}
                  className={`${btnGhost} px-3 py-1.5 ${active ? "border-primary/60 bg-primary/10 text-primary" : ""}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset disabled={!saved || never}>
          <legend className="mono-label mb-3 text-primary">Custom TTL</legend>
          <div className="flex max-w-sm gap-2">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={never ? "" : amount}
              placeholder={never ? "never" : ""}
              onChange={(e) => {
                setAmount(e.target.value);
                setStatus(null);
              }}
              className={`${inputCls} disabled:opacity-50`}
              aria-label="TTL amount"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className={`${inputCls} w-36 disabled:opacity-50`}
              aria-label="TTL unit"
            >
              {UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          {validationError ? (
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-amber">{validationError}</p>
          ) : (
            <p className="mono-label mt-2">
              {never ? "Files never expire — delete them by hand." : `= ${formatDuration(ttlSeconds)}`}
              {limits && !never && ` · range ${formatDuration(limits.minTtlSeconds)} – ${formatDuration(limits.maxTtlSeconds)}`}
            </p>
          )}
        </fieldset>

        <fieldset disabled={!saved}>
          <legend className="mono-label mb-3 text-primary">Burn after read</legend>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={burn}
              onChange={(e) => {
                setBurn(e.target.checked);
                setStatus(null);
              }}
              className="mt-1 size-4 accent-[var(--primary)]"
            />
            <span className="text-sm leading-relaxed text-muted-foreground">
              Delete a file the first time its link is opened.{" "}
              <span className="text-amber">
                Chat apps that preview links (WhatsApp, Slack, Discord) can count as that first open.
              </span>
            </span>
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
          <button type="submit" disabled={busy || !dirty || Boolean(validationError)} className={btnPrimary}>
            {busy ? "Saving…" : "Save"}
          </button>
          {status && (
            <span
              role="status"
              className={`font-mono text-xs uppercase tracking-widest ${status.kind === "ok" ? "text-primary" : "text-amber"}`}
            >
              {status.msg}
            </span>
          )}
          <Link href="/bin" className="mono-label ml-auto hover:text-primary">
            ← Back to upload
          </Link>
        </div>
      </form>
    </>
  );
}
