import { type Ctx, FILE_PREFIX, type FileMeta, ID_RE, isExpired } from "../lib";

/**
 * GET /bin/f/:id — public download. Anyone with the link can fetch it until it
 * expires; the 128-bit random id is what keeps it private.
 */

// Types that are safe to show in the browser tab. Everything else (HTML, SVG,
// JS, …) is forced to download so an upload can never run script on this origin.
const INLINE_SAFE = /^(image\/(png|jpe?g|gif|webp|avif)|video\/(mp4|webm)|audio\/(mpeg|ogg|wav|webm)|application\/pdf|text\/plain)$/;

const notFound = () =>
  new Response("This link has expired or never existed.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

export const onRequestGet = async ({ params, env, request }: Ctx) => {
  const id = String(params.id);
  if (!ID_RE.test(id)) return notFound();
  const key = FILE_PREFIX + id;

  const head = await env.BUCKET.head(key);
  if (!head) return notFound();
  const meta = head.customMetadata as unknown as FileMeta;
  if (isExpired(meta)) {
    await env.BUCKET.delete(key);
    return notFound();
  }

  const burn = meta.burn === "1";
  // Burn-after-read files don't support ranges: the first fetch is the only fetch.
  const obj = await env.BUCKET.get(key, burn ? {} : { range: request.headers, onlyIf: request.headers });
  if (!obj) return notFound();

  const type = head.httpMetadata?.contentType ?? "application/octet-stream";
  const inline = INLINE_SAFE.test(type.split(";")[0].trim().toLowerCase()) && !new URL(request.url).searchParams.has("dl");
  const asciiName = meta.name.replace(/[^\x20-\x7e]|["\\]/g, "_");

  const headers = new Headers();
  const inlineType = /^text\/plain$/i.test(type.trim()) ? "text/plain; charset=utf-8" : type;
  headers.set("content-type", inline ? inlineType : "application/octet-stream");
  headers.set(
    "content-disposition",
    `${inline ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
  );
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "sandbox; default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-robots-tag", "noindex");
  headers.set("cache-control", "private, no-store");
  headers.set("etag", obj.httpEtag);
  headers.set("accept-ranges", burn ? "none" : "bytes");

  if (!("body" in obj)) return new Response(null, { status: 304, headers });

  if (burn) {
    // Delete once the body is handed off; the stream keeps reading from R2.
    await env.BUCKET.delete(key);
    headers.set("content-length", String(obj.size));
    return new Response(obj.body, { status: 200, headers });
  }

  const range = obj.range as { offset?: number; length?: number } | undefined;
  if (range && request.headers.has("range")) {
    const start = range.offset ?? 0;
    const len = range.length ?? obj.size - start;
    headers.set("content-range", `bytes ${start}-${start + len - 1}/${obj.size}`);
    headers.set("content-length", String(len));
    return new Response(obj.body, { status: 206, headers });
  }
  headers.set("content-length", String(obj.size));
  return new Response(obj.body, { status: 200, headers });
};
