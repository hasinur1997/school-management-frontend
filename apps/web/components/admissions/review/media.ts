/**
 * Resolve a stored media path (applicant photo, uploaded document) to an
 * absolute URL for the review surface (task 2.6). Absolute URLs are returned
 * as-is; relative paths are prefixed with the API base URL — same convention as
 * the public status-check (task 2.9).
 */

import { API_BASE_URL } from "@/lib/api"

export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}
