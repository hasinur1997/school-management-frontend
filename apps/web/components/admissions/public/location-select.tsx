"use client"

/**
 * String-valued select for the cascading address dropdowns (task 2.5) —
 * division / district / upazila / post office. Mirrors the academic
 * `AcademicSelect` but its value is a label string (the address fields submit
 * the chosen names). Disabled with an explanatory placeholder until its parent
 * level is chosen, and disabled when it has no options.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

export interface LocationSelectProps {
  value: string | null
  onValueChange: (value: string | null) => void
  options: string[]
  placeholder?: string
  /** Disabled for a dependency reason (parent unset); explains why. */
  disabled?: boolean
  disabledPlaceholder?: string
  emptyPlaceholder?: string
  id?: string
  className?: string
  "aria-label"?: string
}

export function LocationSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled = false,
  disabledPlaceholder,
  emptyPlaceholder = "None available",
  id,
  className,
  "aria-label": ariaLabel,
}: LocationSelectProps) {
  const isEmpty = !disabled && options.length === 0
  const effectiveDisabled = disabled || isEmpty

  const placeholderText = disabled
    ? (disabledPlaceholder ?? placeholder)
    : isEmpty
      ? emptyPlaceholder
      : placeholder

  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange((next as string | null) ?? null)}
      disabled={effectiveDisabled}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholderText}>
          {(selected: string | null) =>
            selected && options.includes(selected) ? selected : placeholderText
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
