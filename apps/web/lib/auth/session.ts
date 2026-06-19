/**
 * Server-side session helper. The Sanctum bearer token lives in an httpOnly
 * cookie set here (never `localStorage`, never readable by browser JS — see
 * `architecture-context.md`, Storage model). Server components, route guards,
 * and server actions read/write the token through this module.
 *
 * Importing `next/headers` makes every consumer server-only, so this file never
 * reaches the client bundle.
 */

import { cookies } from "next/headers"

/** Name of the httpOnly cookie holding the bearer token. */
export const SESSION_COOKIE = "session_token"

/** A long-lived session; the API revokes the token server-side on logout. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

/** Current bearer token from the request cookies, or `null` when signed out. */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

/** Whether the request carries a session cookie (used by the route guard). */
export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionToken()) !== null
}

/** Persist the bearer token in the httpOnly cookie (called after login). */
export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

/** Remove the session cookie (called on logout / after a `401`). */
export async function clearSessionToken(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
