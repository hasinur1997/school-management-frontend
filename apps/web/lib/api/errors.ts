/**
 * Typed API errors. The Axios response interceptor (`client.ts`) normalizes
 * every failure into one of these so screens and hooks can branch on the
 * *kind* of failure instead of poking at raw Axios/HTTP internals.
 *
 *   401 → session cleared + redirect (no error surfaces to the screen)
 *   422 → ApiValidationError   (field → messages[])
 *   403 → ApiForbiddenError    (render an access-denied state)
 *   404 → ApiNotFoundError     (render a not-found state)
 *   network / 5xx → ApiNetworkError (retryable)
 *   anything else → ApiError
 */

import type { ValidationErrors } from "@/types/api"

/** Base class for every error the API client throws. */
export class ApiError extends Error {
  /** HTTP status, or `0` when the request never reached the server. */
  readonly status: number
  /** Whether retrying the same request might succeed (network / 5xx). */
  readonly retryable: boolean

  constructor(message: string, status: number, retryable = false) {
    super(message)
    this.name = new.target.name
    this.status = status
    this.retryable = retryable
  }
}

/** `422` — Laravel Form Request validation failure. */
export class ApiValidationError extends ApiError {
  /** Field name → list of human messages for that field. */
  readonly errors: ValidationErrors

  constructor(message: string, errors: ValidationErrors) {
    super(message, 422)
    this.errors = errors
  }

  /** First message for a field, if any — handy for inline display. */
  first(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

/** `403` — authenticated but not allowed; render an access-denied state. */
export class ApiForbiddenError extends ApiError {
  constructor(message: string) {
    super(message, 403)
  }
}

/** `404` — record missing or out of branch scope; render a not-found state. */
export class ApiNotFoundError extends ApiError {
  constructor(message: string) {
    super(message, 404)
  }
}

/** Network failure or `5xx` — retryable by design. */
export class ApiNetworkError extends ApiError {
  constructor(message: string, status = 0) {
    super(message, status, true)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isValidationError(error: unknown): error is ApiValidationError {
  return error instanceof ApiValidationError
}

export function isForbiddenError(error: unknown): error is ApiForbiddenError {
  return error instanceof ApiForbiddenError
}

export function isNotFoundError(error: unknown): error is ApiNotFoundError {
  return error instanceof ApiNotFoundError
}
