/**
 * The single Axios instance every feature talks to the Laravel `/api/v1`
 * through. Responsibilities, and nothing more (no business logic):
 *
 *  - base URL from env, `Accept: application/json`
 *  - request interceptor: attach `Authorization: Bearer {token}` from session
 *  - response interceptor: unwrap the `{ success, message, data, meta? }`
 *    envelope and normalize every failure into a typed error (see `errors.ts`)
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios"

import type { ApiEnvelope, ApiErrorBody, ApiResult } from "@/types/api"
import {
  ApiError,
  ApiForbiddenError,
  ApiNetworkError,
  ApiNotFoundError,
  ApiValidationError,
} from "./errors"
import { getActiveBranchId } from "./branch"
import { getApiToken, handleUnauthorized } from "./session"

/** Base URL for the Laravel API; overridable per environment. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://app-api.test/api/v1"

const FALLBACK_MESSAGE = "Something went wrong. Please try again."

/** Raw Axios instance. Prefer the typed `api` helpers below over using this. */
export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
})

/**
 * Token-free Axios instance for standalone public endpoints. It shares base URL,
 * envelope handling, and normalized errors with `http`, but intentionally has no
 * auth/branch request interceptor.
 */
export const publicHttp: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
})

// Request: attach the bearer token from the session, when present, plus the
// active `branch_id` for super-admin sessions (the branch bridge stays `null`
// for everyone else, so non-super-admin users never send it — see `branch.ts`).
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getApiToken()
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`)
  }

  // A branch_id a caller passed explicitly (a screen-local branch filter)
  // takes precedence over the global active branch.
  const branchId = getActiveBranchId()
  if (branchId !== null) {
    config.params = { branch_id: branchId, ...config.params }
  }

  return config
})

// Response: pass success envelopes straight through; map failures to typed
// errors so `request<T>()` below can return the unwrapped payload.
http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(normalizeError(error))
)

publicHttp.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => Promise.reject(normalizeError(error))
)

/** Read the API's human `message`, falling back to a safe default. */
function messageFrom(body: ApiErrorBody | undefined, fallback: string): string {
  const message = body?.message
  return typeof message === "string" && message.trim() ? message : fallback
}

/** Translate an Axios failure into one of our typed `ApiError`s. */
function normalizeError(error: AxiosError<ApiErrorBody>): ApiError {
  // No response → the request never reached the server (offline, DNS, CORS…).
  if (!error.response) {
    return new ApiNetworkError(
      "Can't reach the server. Check your connection and try again."
    )
  }

  const { status, data } = error.response

  switch (status) {
    case 401:
      // Clear the session and redirect; the screen never sees this error.
      handleUnauthorized()
      return new ApiError(
        messageFrom(data, "Your session has expired. Please sign in again."),
        401
      )
    case 403:
      return new ApiForbiddenError(
        messageFrom(data, "You don't have permission to do that.")
      )
    case 404:
      return new ApiNotFoundError(
        messageFrom(data, "We couldn't find what you were looking for.")
      )
    case 422:
      return new ApiValidationError(
        messageFrom(data, "Please correct the highlighted fields."),
        data?.errors ?? {}
      )
    default:
      if (status >= 500) {
        return new ApiNetworkError(
          messageFrom(data, "The server ran into a problem. Please try again."),
          status
        )
      }
      return new ApiError(messageFrom(data, FALLBACK_MESSAGE), status)
  }
}

/**
 * Core request helper: performs the call and unwraps the envelope, returning
 * the payload plus any pagination `meta`. Throws a typed `ApiError` on failure.
 */
export async function request<T>(
  config: AxiosRequestConfig
): Promise<ApiResult<T>> {
  const response = await http.request<ApiEnvelope<T>>(config)
  const { data, meta } = response.data
  return { data, meta }
}

export async function publicRequest<T>(
  config: AxiosRequestConfig
): Promise<ApiResult<T>> {
  const response = await publicHttp.request<ApiEnvelope<T>>(config)
  const { data, meta } = response.data
  return { data, meta }
}

/**
 * Typed verb helpers. Each resolves to the unwrapped `data` for the common
 * case; reach for `request<T>()` directly when a caller also needs `meta`
 * (e.g. paginated lists — see `requestPaginated`).
 */
export const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    (await request<T>({ ...config, method: "GET", url })).data,

  post: async <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    (await request<T>({ ...config, method: "POST", url, data: body })).data,

  put: async <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    (await request<T>({ ...config, method: "PUT", url, data: body })).data,

  patch: async <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    (await request<T>({ ...config, method: "PATCH", url, data: body })).data,

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    (await request<T>({ ...config, method: "DELETE", url })).data,
}

export const publicApi = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    (await publicRequest<T>({ ...config, method: "GET", url })).data,

  post: async <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> =>
    (await publicRequest<T>({ ...config, method: "POST", url, data: body }))
      .data,
}

/**
 * Paginated GET that returns both rows and `meta`. The envelope already keeps
 * `data` as the row array and `meta` alongside it, so this just guarantees a
 * `meta` is present for list screens.
 */
export async function requestPaginated<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<{ data: T[]; meta: ApiResult<T[]>["meta"] }> {
  const { data, meta } = await request<T[]>({ ...config, method: "GET", url })
  return { data, meta }
}
