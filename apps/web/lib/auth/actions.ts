"use server"

/**
 * Server actions that own the session cookie. The token is set/cleared only
 * here (server-side, httpOnly) so it never touches the client bundle.
 *
 *  - `loginAction`  — exchange credentials for a token, store it, report errors.
 *  - `logoutAction` — revoke the token via the API, clear the cookie, redirect.
 *  - `clearSessionAction` — drop the cookie on a `401` (token already dead).
 */

import { redirect } from "next/navigation"

import type { ValidationErrors } from "@/types/api"
import type { LoginResponse } from "@/types/auth"
import { serverApiRequest } from "./server-api"
import { clearSessionToken, getSessionToken, setSessionToken } from "./session"

export interface LoginInput {
  email: string
  password: string
}

/**
 * Rename API validation keys to the field names the form renders, so a `422`
 * lands on the matching input (e.g. the API's `login` → the form's `email`).
 */
function remapFieldErrors(
  errors: ValidationErrors,
  map: Record<string, string>
): ValidationErrors {
  const out: ValidationErrors = {}
  for (const [key, messages] of Object.entries(errors)) {
    out[map[key] ?? key] = messages
  }
  return out
}

export type LoginActionResult =
  | { ok: true }
  | { ok: false; message: string; errors?: ValidationErrors }

/**
 * Authenticate against `POST /auth/login`. On success the bearer token is
 * persisted in the httpOnly cookie and `{ ok: true }` is returned so the client
 * can navigate + refresh; failures pass the API `message` and any `422` field
 * errors back to the form.
 */
export async function loginAction(
  input: LoginInput
): Promise<LoginActionResult> {
  const result = await serverApiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    // The API takes a generic `login` identifier (email/username) plus a
    // `device_name` to label the issued token — not `email`/`password`.
    body: {
      login: input.email,
      password: input.password,
      device_name: "web",
    },
  })

  if (!result.ok) {
    // The API validates the identifier as `login`; surface it on the email
    // input the form actually renders.
    const errors = result.errors
      ? remapFieldErrors(result.errors, { login: "email" })
      : undefined
    return { ok: false, message: result.message, errors }
  }

  // Be tolerant of a `token` / `access_token` envelope key.
  const token =
    result.data?.token ??
    (result.data as { access_token?: string } | null)?.access_token ??
    null

  if (!token) {
    return {
      ok: false,
      message: "Login succeeded but no token was returned.",
    }
  }

  await setSessionToken(token)
  return { ok: true }
}

/**
 * Revoke the token server-side (best effort) and clear the cookie, then send
 * the user to login. Triggered from the user menu (built in 1.5).
 */
export async function logoutAction(): Promise<never> {
  const token = await getSessionToken()

  if (token) {
    // Best effort: even if revoke fails, we still clear the local session.
    await serverApiRequest("/auth/logout", { method: "POST", token })
  }

  await clearSessionToken()
  redirect("/login")
}

/**
 * Clear the session cookie without calling the API — used when a request has
 * already `401`'d, so the token is known dead and revoke would just fail.
 */
export async function clearSessionAction(): Promise<void> {
  await clearSessionToken()
}
