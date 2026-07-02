"use client"

/**
 * `AcademicSelect` — the shared, controlled dropdown behind every academic
 * selector (`SessionSelect`, `ClassSelect`, `SectionSelect`, `SubjectSelect`,
 * task 2.1). It owns the four read-state presentations so each concrete selector
 * only has to map its hook's data into options:
 *
 *   - **loading**  — disabled trigger with a spinner + "Loading…" placeholder
 *   - **error**    — disabled trigger showing a "couldn't load" placeholder
 *   - **empty**    — disabled trigger showing the empty placeholder
 *   - **disabled** — explicitly disabled (e.g. section before a class is chosen)
 *   - **loaded**   — the options, with the selected label rendered in the trigger
 *
 * Fully controlled: the parent owns `value` (a numeric id or `null`) and gets
 * `onValueChange` on selection. Values are numeric ids; `null` means unselected.
 */

import * as React from "react"
import { ChevronDown, Loader2 } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * An option/selected id. Backend resources now expose opaque `public_id`
 * hashes (e.g. `"a3Xk9"`) as their `id`, so ids are no longer guaranteed
 * numeric — they may be either a number or a hash string.
 */
export type SelectId = number | string

export interface AcademicSelectOption<T extends SelectId = SelectId> {
  value: T
  label: string
}

export interface AcademicSelectProps<T extends SelectId = SelectId> {
  /** Selected id, or `null` when nothing is chosen. Controlled by the parent. */
  value: T | null
  /** Called with the newly selected id, or `null` when cleared. */
  onValueChange: (value: T | null) => void
  /** The choices to render (already mapped from the read hook's data). */
  options: AcademicSelectOption<T>[]
  /** Placeholder shown in the loaded-but-unselected state. */
  placeholder?: string
  /** The hook is fetching its first page of data. */
  isLoading?: boolean
  /** The read failed. */
  isError?: boolean
  /**
   * Disabled for a reason other than load state — e.g. a dependent select whose
   * parent hasn't been chosen yet. `disabledPlaceholder` explains why.
   */
  disabled?: boolean
  /**
   * When set, the empty option is selectable with this label (e.g. "All
   * sections"), so a made selection can be cleared back to `null`.
   */
  clearLabel?: string
  loadingPlaceholder?: string
  errorPlaceholder?: string
  emptyPlaceholder?: string
  disabledPlaceholder?: string
  id?: string
  className?: string
  "aria-label"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

export function AcademicSelect<T extends SelectId = SelectId>({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  isLoading = false,
  isError = false,
  disabled = false,
  clearLabel,
  loadingPlaceholder = "Loading…",
  errorPlaceholder = "Couldn't load",
  emptyPlaceholder = "None available",
  disabledPlaceholder,
  id,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: AcademicSelectProps<T>) {
  const isEmpty = !isLoading && !isError && options.length === 0
  const selectedValue = value == null ? null : String(value)

  // Disable interaction whenever there's nothing useful to pick from.
  const effectiveDisabled =
    disabled || isLoading || isError || isEmpty

  // The placeholder text reflects whichever non-loaded state is active. When a
  // value is selected its label is rendered instead (see the function child).
  const placeholderText = isLoading
    ? loadingPlaceholder
    : isError
      ? errorPlaceholder
      : disabled
        ? (disabledPlaceholder ?? placeholder)
        : isEmpty
          ? emptyPlaceholder
          : placeholder

  function handleValueChange(next: string) {
    if (next == null || next === "") {
      onValueChange(null)
      return
    }

    // Match by string form so both numeric and hash (`public_id`) ids work,
    // then emit the option's original value untouched — coercing to a number
    // would turn a hash id into `NaN` and silently clear the selection.
    const match = options.find((option) => String(option.value) === next)
    onValueChange(match ? match.value : null)
  }

  return (
    <div className={cn("relative w-full min-w-[10rem]", className)}>
      {isLoading ? (
        <Loader2
          className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden
        />
      ) : null}
      <select
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        value={selectedValue ?? ""}
        onChange={(event) => handleValueChange(event.target.value)}
        disabled={effectiveDisabled}
        className={cn(
          "h-10 w-full appearance-none rounded-lg border border-input bg-transparent py-2 pr-8 pl-3.5 text-sm text-foreground transition-colors outline-none dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          selectedValue == null && "text-muted-foreground",
          isLoading && "pl-8"
        )}
      >
        <option value="" disabled={clearLabel == null || effectiveDisabled}>
          {effectiveDisabled ? placeholderText : (clearLabel ?? placeholderText)}
        </option>
        {options.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}
