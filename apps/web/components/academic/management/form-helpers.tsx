"use client"

/**
 * Small shared form helpers for the academic create/edit dialogs (task 2.2):
 *
 *  - `FormBanner` — the form-level error banner for non-field `422` messages and
 *    general failures (`code-standards.md`, Forms).
 *  - `applyFieldErrors` — maps an `ApiValidationError`'s field messages back onto
 *    the matching RHF inputs, focusing the first, and reports whether any field
 *    matched (so the caller knows to fall back to the banner).
 */

import type {
  FieldValues,
  Path,
  UseFormReturn,
} from "react-hook-form"

import { AlertTriangle } from "lucide-react"

import type { ApiValidationError } from "@/lib/api"

export function FormBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-error/20 bg-error/10 px-3 py-2 text-sm text-error"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  )
}

/**
 * Map a `422` onto the form's fields. Returns `true` when at least one field
 * error was applied; the caller surfaces a banner/toast otherwise.
 */
export function applyFieldErrors<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiValidationError,
  fields: readonly Path<TValues>[]
): boolean {
  let mapped = false
  for (const field of fields) {
    const message = error.first(field)
    if (!message) continue
    form.setError(field, { message }, { shouldFocus: !mapped })
    mapped = true
  }
  return mapped
}
