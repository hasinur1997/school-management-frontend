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
import { Loader2 } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

export interface AcademicSelectOption {
  value: number
  label: string
}

export interface AcademicSelectProps {
  /** Selected id, or `null` when nothing is chosen. Controlled by the parent. */
  value: number | null
  /** Called with the newly selected id, or `null` when cleared. */
  onValueChange: (value: number | null) => void
  /** The choices to render (already mapped from the read hook's data). */
  options: AcademicSelectOption[]
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
  loadingPlaceholder?: string
  errorPlaceholder?: string
  emptyPlaceholder?: string
  disabledPlaceholder?: string
  id?: string
  className?: string
  "aria-label"?: string
}

export function AcademicSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  isLoading = false,
  isError = false,
  disabled = false,
  loadingPlaceholder = "Loading…",
  errorPlaceholder = "Couldn't load",
  emptyPlaceholder = "None available",
  disabledPlaceholder,
  id,
  className,
  "aria-label": ariaLabel,
}: AcademicSelectProps) {
  const isEmpty = !isLoading && !isError && options.length === 0

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

  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange((next as number | null) ?? null)}
      disabled={effectiveDisabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn("w-full min-w-[10rem]", className)}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-copy-muted" aria-hidden />
        ) : null}
        <SelectValue placeholder={placeholderText}>
          {(selected: number | null) => {
            const match = options.find((option) => option.value === selected)
            return match ? match.label : placeholderText
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
