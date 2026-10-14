/// <reference types="@cloudflare/workers-types" />
/** Shared helpers for the filebin Worker (entry point: server/index.ts). */

export interface Env {
  /** The built Vite site (dist/), served for every non-API path. */
  ASSETS: Fetcher;
  /** R2 bucket holding uploads (files/<id>) and settings (_meta/settings.json). */
  BUCKET: R2Bucket;
  /** Set as an encrypted secret in Cloudflare — never commit it. */
  FILEBIN_PASSWORD: string;
}

export interface Ctx {
  request: Request;
  env: Env;
  params: Record<string, string>;
}

/* ---------------- responses ---------------- */

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function error(status: number, message: string): Response {
  return json({ error: message }, { status });
}

/* ---------------- settings (TTL) ---------------- */

export const SETTINGS_KEY = "_meta/settings.json";
export const MIN_TTL_SECONDS = 60; // 1 minute
export const MAX_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year
export const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 1 day

export interface Settings {
  /** TTL applied to every new upload. 0 = never expire. */
  ttlSeconds: number;
  /** If true, a file is deleted after its first successful download. */
  burnAfterRead: boolean;
}

const DEFAULT_SETTINGS: Settings = { ttlSeconds: DEFAULT_TTL_SECONDS, burnAfterRead: false };

export async function readSettings(env: Env): Promise<Settings> {
  const obj = await env.BUCKET.get(SETTINGS_KEY);
  if (!obj) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(await obj.json<Partial<Settings>>()) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function validateSettings(input: unknown): Settings | string {
  if (!input || typeof input !== "object") return "Body must be a JSON object.";
  const { ttlSeconds, burnAfterRead } = input as Record<string, unknown>;
  if (typeof ttlSeconds !== "number" || !Number.isInteger(ttlSeconds)) {
    return "ttlSeconds must be an integer.";
  }
  if (ttlSeconds !== 0 && (ttlSeconds < MIN_TTL_SECONDS || ttlSeconds > MAX_TTL_SECONDS)) {
    return `ttlSeconds must be 0 (never) or between ${MIN_TTL_SECONDS} and ${MAX_TTL_SECONDS}.`;
  }
  if (typeof burnAfterRead !== "boolean") return "burnAfterRead must be a boolean.";
  return { ttlSeconds, burnAfterRead };
}

/* ---------------- file metadata ---------------- */

export const FILE_PREFIX = "files/";

/** Stored as R2 customMetadata (all values must be strings). */
export interface FileMeta {
  name: string;
  /** Epoch ms; "0" means never expires. */
  expiresAt: string;
  uploadedAt: string;
  burn: "0" | "1";
}

export function isExpired(meta: Partial<FileMeta> | undefined, now = Date.now()): boolean {
  const exp = Number(meta?.expiresAt ?? 0);
  return exp > 0 && exp <= now;
}

/** 128-bit random, URL-safe id. Unguessable — this is what makes share links private. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const ID_RE = /^[A-Za-z0-9_-]{22}$/;

export function sanitizeName(raw: string | null): string {
  let name = raw ? safeDecode(raw) : "file";
  name = name.replace(/[\u0000-\u001f\u007f/\\]/g, "_").trim();
  if (!name || name === "." || name === "..") name = "file";
  return name.slice(0, 200);
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Deletes every expired object. Runs hourly on the Worker's cron trigger and
 * whenever the owner lists files. Downloads also check expiry themselves, so an
 * expired file is never served even between sweeps.
 */
export async function sweepExpired(env: Env): Promise<R2Object[]> {
  const live: R2Object[] = [];
  const dead: string[] = [];
  const now = Date.now();
  let cursor: string | undefined;
  do {
    const page = await env.BUCKET.list({
      prefix: FILE_PREFIX,
      cursor,
      limit: 1000,
      include: ["customMetadata", "httpMetadata"],
    });
    for (const obj of page.objects) {
      if (isExpired(obj.customMetadata as Partial<FileMeta>, now)) dead.push(obj.key);
      else live.push(obj);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  for (let i = 0; i < dead.length; i += 1000) {
    await env.BUCKET.delete(dead.slice(i, i + 1000));
  }
  return live;
}

/* ---------------- auth ---------------- */

const COOKIE = "fb_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days

const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}

/** Constant-time password check (compare digests so lengths always match). */
export async function passwordMatches(env: Env, candidate: string): Promise<boolean> {
  if (!env.FILEBIN_PASSWORD) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(candidate)),
    crypto.subtle.digest("SHA-256", enc.encode(env.FILEBIN_PASSWORD)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

/**
 * Session token = "<expiresEpochSec>.<hmac>". Keyed on the password itself, so
 * changing FILEBIN_PASSWORD signs everyone out.
 */
export async function sessionCookie(env: Env, secure: boolean): Promise<string> {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(env.FILEBIN_PASSWORD), enc.encode(exp));
  return cookieString(`${exp}.${b64url(sig)}`, SESSION_SECONDS, secure);
}

export function clearCookie(secure: boolean): string {
  return cookieString("", 0, secure);
}

function cookieString(value: string, maxAge: number, secure: boolean): string {
  return [
    `${COOKIE}=${value}`,
    "Path=/bin",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export async function isAuthed(request: Request, env: Env): Promise<boolean> {
  if (!env.FILEBIN_PASSWORD) return false;
  const raw = request.headers.get("cookie") ?? "";
  const token = raw
    .split(/;\s*/)
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) < Date.now() / 1000) return false;
  try {
    return await crypto.subtle.verify(
      "HMAC",
      await hmacKey(env.FILEBIN_PASSWORD),
      fromB64url(sig),
      enc.encode(exp),
    );
  } catch {
    return false;
  }
}

export function isSecure(request: Request): boolean {
  return new URL(request.url).protocol === "https:";
}

/**
 * Wraps a handler so it only runs for a logged-in owner. Also rejects
 * cross-site writes (belt-and-braces on top of SameSite=Strict).
 */
export function requireAuth(handler: (ctx: Ctx) => Promise<Response> | Response) {
  return async (ctx: Ctx): Promise<Response> => {
    const { request, env } = ctx;
    if (!env.FILEBIN_PASSWORD) return error(500, "FILEBIN_PASSWORD secret is not set.");
    if (request.method !== "GET" && request.method !== "HEAD") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) return error(403, "Cross-origin request blocked.");
    }
    if (!(await isAuthed(request, env))) return error(401, "Not signed in.");
    return handler(ctx);
  };
}
