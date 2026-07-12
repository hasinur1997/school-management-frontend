/**
 * Route a remote image URL through the same-origin `/api/image-proxy` handler so
 * the browser can `fetch`/canvas it without a cross-origin (CORS) block — used
 * when embedding the student photo into the client-rendered ID card PDF.
 *
 * Only absolute `http(s)` URLs are proxied; relative (already same-origin) and
 * `data:` URLs are returned untouched.
 */
export function proxiedImageUrl(
  url: string | null | undefined
): string | null {
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}
