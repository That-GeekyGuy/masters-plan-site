import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  ApiError,
  type FileItem,
  type Settings,
  api,
  formatBytes,
  formatDuration,
  formatRemaining,
  upload,
} from "./api";
import { Link, PageHeader, btnGhost } from "./ui";

const MAX_BYTES = 100 * 1024 * 1024;

interface Pending {
  key: string;
  name: string;
  size: number;
  progress: number;
  error?: string;
  abort?: () => void;
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function UploadPage({ onAuthLost }: { onAuthLost: () => void }) {
  const [files, setFiles] = useState<FileItem[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const now = useNow();

  const handleErr = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) onAuthLost();
      return err instanceof Error ? err.message : "Something went wrong.";
    },
    [onAuthLost],
  );

  const refresh = useCallback(async () => {
    try {
      const [{ files }, { settings }] = await Promise.all([api.list(), api.getSettings()]);
      setFiles(files);
      setSettings(settings);
      setLoadError(null);
    } catch (err) {
      setLoadError(handleErr(err));
    }
  }, [handleErr]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Drop rows from the list as soon as they expire, without a refetch.
  const visible = files?.filter((f) => !f.expiresAt || f.expiresAt > now) ?? null;

  const startUploads = async (list: FileList | File[]) => {
    for (const file of Array.from(list)) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      if (file.size > MAX_BYTES) {
        setPending((p) => [...p, { key, name: file.name, size: file.size, progress: 0, error: "Over 100 MB limit" }]);
        continue;
      }
      if (file.size === 0) {
        setPending((p) => [...p, { key, name: file.name, size: 0, progress: 0, error: "Empty file" }]);
        continue;
      }
      const job = upload(file, (progress) =>
        setPending((p) => p.map((x) => (x.key === key ? { ...x, progress } : x))),
      );
      setPending((p) => [...p, { key, name: file.name, size: file.size, progress: 0, abort: job.abort }]);
      try {
        const res = await job.promise;
        setPending((p) => p.filter((x) => x.key !== key));
        setFiles((fs) => [
          {
            id: res.id,
            name: res.name,
            size: res.size,
            type: file.type,
            uploadedAt: Date.now(),
            expiresAt: res.expiresAt,
            burnAfterRead: res.burnAfterRead,
          },
          ...(fs ?? []),
        ]);
        void copy(res.url, res.id);
      } catch (err) {
        const message = handleErr(err);
        setPending((p) => p.map((x) => (x.key === key ? { ...x, error: message, abort: undefined } : x)));
      }
    }
  };

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    } catch {
      /* clipboard can be blocked; link is still visible */
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this file now? The link stops working immediately.")) return;
    try {
      await api.remove(id);
      setFiles((fs) => fs?.filter((f) => f.id !== id) ?? null);
    } catch (err) {
      alert(handleErr(err));
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) void startUploads(e.dataTransfer.files);
  };

  const linkFor = (id: string) => `${window.location.origin}/f/${id}`;

  return (
    <>
      <PageHeader eyebrow="// OPS · FILEBIN · UPLOAD" title="Drop it, share it, let it expire.">
        Anyone with a link can download until it expires. Links are 128-bit random — unguessable,
        but treat them like the file itself.
      </PageHeader>

      <div className="mono-label mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-3">
        <span>
          TTL ·{" "}
          <span className="text-primary">{settings ? formatDuration(settings.ttlSeconds).toUpperCase() : "…"}</span>
        </span>
        {settings?.burnAfterRead && <span className="text-amber">BURN AFTER READ · ON</span>}
        <span>MAX · 100 MB / FILE</span>
        <Link href="/settings" className="ml-auto text-primary hover:underline">
          Change TTL →
        </Link>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Choose files to upload"
        className={`surface-panel flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "hover:border-primary/50"
        }`}
      >
        <span className="font-display text-xl font-semibold text-foreground">
          {dragging ? "Release to upload" : "Drop files here"}
        </span>
        <span className="text-sm text-muted-foreground">or tap to pick — the link is copied when it finishes</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void startUploads(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {pending.length > 0 && (
        <ul className="mt-4 space-y-2">
          {pending.map((p) => (
            <li key={p.key} className="surface-panel px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{p.name}</span>
                <span className="mono-label shrink-0">
                  {p.error ? <span className="text-amber">{p.error}</span> : `${Math.round(p.progress * 100)}%`}
                </span>
                {p.abort && (
                  <button type="button" className={btnGhost} onClick={p.abort}>
                    Cancel
                  </button>
                )}
                {p.error && (
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => setPending((ps) => ps.filter((x) => x.key !== p.key))}
                  >
                    Dismiss
                  </button>
                )}
              </div>
              {!p.error && (
                <div className="mt-2 h-1 bg-border">
                  <div className="h-1 bg-primary transition-[width]" style={{ width: `${p.progress * 100}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <section className="mt-12">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Live files</h2>
          <button type="button" className={btnGhost} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        {loadError && <p className="font-mono text-xs uppercase tracking-widest text-amber">{loadError}</p>}
        {visible && visible.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here. Uploads show up with their countdown.</p>
        )}
        <ul className="space-y-2">
          {visible?.map((f) => (
            <li key={f.id} className="surface-panel flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <a
                  href={`/f/${f.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate font-mono text-sm text-foreground hover:text-primary"
                  title={f.name}
                >
                  {f.name}
                </a>
                <p className="mono-label mt-1 flex flex-wrap gap-x-4">
                  <span>{formatBytes(f.size)}</span>
                  <span>
                    EXPIRES ·{" "}
                    <span className={f.expiresAt && f.expiresAt - now < 3600_000 ? "text-amber" : "text-primary"}>
                      {formatRemaining(f.expiresAt, now)}
                    </span>
                  </span>
                  {f.burnAfterRead && <span className="text-amber">BURNS ON FIRST DOWNLOAD</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button type="button" className={btnGhost} onClick={() => void copy(linkFor(f.id), f.id)}>
                  {copied === f.id ? "Copied ✓" : "Copy link"}
                </button>
                <button
                  type="button"
                  className={`${btnGhost} hover:border-amber/60 hover:text-amber`}
                  onClick={() => void remove(f.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
