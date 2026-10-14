export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  expiresAt: number | null;
  burnAfterRead: boolean;
}

export interface Settings {
  ttlSeconds: number;
  burnAfterRead: boolean;
}

export interface Limits {
  minTtlSeconds: number;
  maxTtlSeconds: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin", ...init });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON (e.g. the SPA's index.html when Functions aren't running) */
  }
  if (!res.ok || body === null) {
    const msg =
      (body as { error?: string } | null)?.error ??
      (res.ok ? "The API isn't reachable — are Pages Functions running?" : `Request failed (${res.status})`);
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

const jsonInit = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(data),
});

export const api = {
  session: () => call<{ authed: boolean; configured: boolean }>("/bin/api/session"),
  login: (password: string) => call<{ ok: true }>("/bin/api/login", jsonInit("POST", { password })),
  logout: () => call<{ ok: true }>("/bin/api/logout", { method: "POST" }),
  list: () => call<{ files: FileItem[] }>("/bin/api/files"),
  remove: (id: string) => call<{ ok: true }>(`/bin/api/files/${id}`, { method: "DELETE" }),
  getSettings: () => call<{ settings: Settings; limits: Limits }>("/bin/api/settings"),
  saveSettings: (s: Settings) =>
    call<{ settings: Settings; limits: Limits }>("/bin/api/settings", jsonInit("PUT", s)),
};

export interface UploadResult {
  id: string;
  name: string;
  size: number;
  url: string;
  expiresAt: number | null;
  burnAfterRead: boolean;
}

/** XHR rather than fetch so we get upload progress. */
export function upload(
  file: File,
  onProgress: (fraction: number) => void,
): { promise: Promise<UploadResult>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<UploadResult>((resolve, reject) => {
    xhr.open("PUT", "/bin/api/files");
    xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { error?: string } & Partial<UploadResult> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.id) resolve(body as UploadResult);
      else reject(new ApiError(xhr.status, body.error ?? `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new ApiError(0, "Network error during upload."));
    xhr.onabort = () => reject(new ApiError(0, "Upload cancelled."));
    xhr.send(file);
  });
  return { promise, abort: () => xhr.abort() };
}

/* ---------------- formatting ---------------- */

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "never";
  const parts: [number, string][] = [
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  const out: string[] = [];
  let rest = seconds;
  for (const [size, unit] of parts) {
    const n = Math.floor(rest / size);
    if (n) out.push(`${n}${unit}`);
    rest -= n * size;
  }
  return out.slice(0, 2).join(" ") || `${seconds}s`;
}

/** "in 3h 12m" / "expired" / "never" */
export function formatRemaining(expiresAt: number | null, now: number): string {
  if (!expiresAt) return "never";
  const s = Math.floor((expiresAt - now) / 1000);
  if (s <= 0) return "expired";
  if (s < 60) return `in ${s}s`;
  return `in ${formatDuration(s)}`;
}
