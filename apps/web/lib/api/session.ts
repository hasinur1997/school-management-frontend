/**
 * Session bridge between the API client and the auth layer (task 1.4).
 *
 * The Sanctum token lives in an httpOnly cookie and so is not readable by
 * browser JS. The auth layer reads it server-side and pushes it into this
 * in-memory holder (`setApiToken`) for the client-side Axios instance to
 * attach as a bearer token. This module intentionally holds *no* auth logic —
 * it is a registration point so `lib/api` stays decoupled from `lib/auth`.
 */

let token: string | null = null
let unauthorizedHandler: (() => void) | null = null

/** Store the current bearer token (called by the auth layer after login/load). */
export function setApiToken(next: string | null): void {
  token = next
}

/** Current bearer token, or `null` when unauthenticated. */
export function getApiToken(): string | null {
  return token
}

/** Drop the in-memory token (called on logout / 401). */
export function clearApiToken(): void {
  token = null
}

/**
 * Register how a `401` should be handled — typically clearing the server-side
 * session cookie and redirecting to login. Set by the auth layer; until then a
 * default redirect is used (see `handleUnauthorized`).
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

/**
 * Invoked by the response interceptor on `401`. Clears the in-memory token and
 * delegates to the registered handler, falling back to a hard redirect to the
 * login route so the user is never stranded on an authenticated screen.
 */
export function handleUnauthorized(): void {
  clearApiToken()

  if (unauthorizedHandler) {
    unauthorizedHandler()
    return
  }

  if (typeof window !== "undefined") {
    window.location.assign("/login")
  }
}
