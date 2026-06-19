/**
 * Minimal server-side caller for the auth endpoints used inside server actions
 * (login, logout). The browser-side Axios client in `lib/api` carries an
 * in-memory token and a `window` redirect on `401`, neither of which fits a
 * server action — so token-setting flows talk to the API through this tiny
 * `fetch` wrapper instead. It unwraps the same `{ success, message, data }`
 * envelope and surfaces `422` field errors.
 *
 * Feature/client code never imports this — it goes through `lib/api`.
 */

import type { ValidationErrors } from "@/types/api"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"

interface ServerApiSuccess<T> {
  ok: true
  data: T
  message: string
}

interface ServerApiFailure {
  ok: false
  /** HTTP status, or `0` when the request never reached the server. */
  status: number
  message: string
  /** Field → messages for a `422`, when present. */
  errors?: ValidationErrors
}

export type ServerApiResult<T> = ServerApiSuccess<T> | ServerApiFailure

interface ServerApiRequest {
  method: "GET" | "POST"
  body?: unknown
  /** Bearer token to attach (e.g. for logout/revoke). */
  token?: string | null
}

interface Envelope<T> {
  message?: string
  data?: T
  errors?: ValidationErrors
}

/** Call a `/auth/*` endpoint and normalize the envelope into a tagged result. */
export async function serverApiRequest<T>(
  path: string,
  { method, body, token }: ServerApiRequest
): Promise<ServerApiResult<T>> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    })
  } catch {
    return {
      ok: false,
      status: 0,
      message: "Can't reach the server. Check your connection and try again.",
    }
  }

  const envelope = (await response.json().catch(() => null)) as
    | Envelope<T>
    | null

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: envelope?.message?.trim()
        ? envelope.message
        : "Something went wrong. Please try again.",
      errors: envelope?.errors,
    }
  }

  return {
    ok: true,
    data: (envelope?.data ?? null) as T,
    message: envelope?.message ?? "",
  }
}
