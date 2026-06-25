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
  /** Email or phone — the API resolves either against the `login` field. */
  identifier: string
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
    // The API takes a generic `login` identifier (email or phone) plus a
    // `device_name` to label the issued token — not `email`/`password`.
    body: {
      login: input.identifier,
      password: input.password,
      device_name: "web",
    },
  })

  if (!result.ok) {
    // The API validates the identifier as `login`; surface it on the
    // `identifier` input the form actually renders.
    const errors = result.errors
      ? remapFieldErrors(result.errors, { login: "identifier" })
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

export interface ForgotPasswordInput {
  /** Email or phone — the API resolves either against the `login` field. */
  identifier: string
}

export type ForgotPasswordActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: ValidationErrors }

/**
 * Request a one-time reset code via `POST /auth/forgot-password`. The API
 * replies with the same generic message whether or not an account matches (no
 * enumeration), so a `2xx` is always a success from the UI's point of view —
 * only a validation error (missing identifier) or a network failure is a
 * failure. The code is delivered out-of-band (email + SMS).
 */
export async function forgotPasswordAction(
  input: ForgotPasswordInput
): Promise<ForgotPasswordActionResult> {
  const result = await serverApiRequest<null>("/auth/forgot-password", {
    method: "POST",
    body: { login: input.identifier },
  })

  if (!result.ok) {
    const errors = result.errors
      ? remapFieldErrors(result.errors, { login: "identifier" })
      : undefined
    return { ok: false, message: result.message, errors }
  }

  return { ok: true, message: result.message }
}

export interface VerifyResetCodeInput {
  /** Email or phone the code was issued for. Kept hidden in the UI. */
  identifier: string
  code: string
}

export type VerifyResetCodeActionResult =
  | { ok: true; message: string; resetToken: string }
  | { ok: false; message: string; errors?: ValidationErrors }

/**
 * Verify a one-time reset code via `POST /auth/verify-reset-code`. On success
 * the API returns a temporary reset token; the client keeps it in component
 * state and opens the new-password fields.
 */
export async function verifyResetCodeAction(
  input: VerifyResetCodeInput
): Promise<VerifyResetCodeActionResult> {
  const result = await serverApiRequest<{ reset_token?: string }>(
    "/auth/verify-reset-code",
    {
      method: "POST",
      body: {
        login: input.identifier,
        code: input.code,
      },
    }
  )

  if (!result.ok) {
    const errors = result.errors
      ? remapFieldErrors(result.errors, { login: "identifier" })
      : undefined
    return { ok: false, message: result.message, errors }
  }

  const resetToken = result.data?.reset_token
  if (!resetToken) {
    return {
      ok: false,
      message: "The reset code was verified but no reset token was returned.",
    }
  }

  return { ok: true, message: result.message, resetToken }
}

export interface ResetPasswordInput {
  /** Temporary token returned after reset-code verification. */
  resetToken: string
  password: string
  password_confirmation: string
}

export type ResetPasswordActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: ValidationErrors }

/**
 * Set a new password via `POST /auth/reset-password` using the temporary reset
 * token returned from `verifyResetCodeAction`. The API revokes every existing
 * token on success, so there is no session to establish here — the client
 * routes back to login.
 */
export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ResetPasswordActionResult> {
  const result = await serverApiRequest<null>("/auth/reset-password", {
    method: "POST",
    body: {
      reset_token: input.resetToken,
      password: input.password,
      password_confirmation: input.password_confirmation,
    },
  })

  if (!result.ok) {
    const errors = result.errors
      ? remapFieldErrors(result.errors, { reset_token: "resetToken" })
      : undefined
    return { ok: false, message: result.message, errors }
  }

  return { ok: true, message: result.message }
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
