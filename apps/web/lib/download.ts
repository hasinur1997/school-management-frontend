/**
 * Client-side helpers for saving a streamed file the API returns as a blob
 * (e.g. the money-receipt PDF, task F-5.3). PDFs are streamed by the API and
 * never rendered client-side (`code-standards.md`); the client only triggers
 * the request and hands the blob to the browser's download.
 */

/** Trigger a browser "Save file" for an in-memory blob under `filename`. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoke on the next tick so the click has committed the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Pull a filename out of a `Content-Disposition` response header, preferring the
 * RFC 5987 `filename*=UTF-8''…` form (percent-decoded) over a plain
 * `filename="…"`. Falls back to `fallback` when the header is absent or unparsable
 * so a download always has a sensible name.
 */
export function filenameFromContentDisposition(
  header: string | null | undefined,
  fallback: string
): string {
  if (!header) return fallback

  const extended = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim().replace(/^"|"$/g, ""))
    } catch {
      // Malformed encoding — fall through to the plain form.
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header)
  if (plain?.[1]) return plain[1].trim()

  return fallback
}
