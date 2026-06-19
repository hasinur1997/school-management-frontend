import { toast as sonner, type ExternalToast } from "sonner"

/**
 * Standardized Sonner toast helpers (`ui-context.md`, Feedback & States).
 *
 * - Success/error feedback prefers the API's `message`, with a sensible
 *   fallback — never a raw stack trace or `[object Object]`.
 * - Pass a stable `id` per action so rapid repeats replace the prior toast
 *   instead of stacking.
 */

export type ToastOptions = ExternalToast

/** Shape of the API error envelope we read messages from. */
interface ApiErrorEnvelope {
  message?: unknown
  errors?: Record<string, string[] | string>
}

/**
 * Best-effort extraction of a human message from an unknown thrown value —
 * Axios errors (`response.data.message`), plain `Error`s, strings, or raw
 * envelopes — falling back to a provided default.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (typeof error === "string") return error || fallback

  if (error && typeof error === "object") {
    // Axios-style error: { response: { data: { message } } }
    const response = (error as { response?: { data?: unknown } }).response
    const envelope = (response?.data ?? error) as ApiErrorEnvelope

    if (typeof envelope.message === "string" && envelope.message.trim()) {
      return envelope.message
    }

    // First field error from a 422 validation envelope.
    if (envelope.errors && typeof envelope.errors === "object") {
      const first = Object.values(envelope.errors)[0]
      const msg = Array.isArray(first) ? first[0] : first
      if (typeof msg === "string" && msg.trim()) return msg
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message
    }
  }

  return fallback
}

/** Success toast describing what happened. */
export function toastSuccess(message: string, options?: ToastOptions) {
  return sonner.success(message, options)
}

/** Error toast that prefers the API `message`, with a fallback. */
export function toastError(
  error: unknown,
  fallback?: string,
  options?: ToastOptions
) {
  return sonner.error(getErrorMessage(error, fallback), options)
}

export { sonner as toast }
