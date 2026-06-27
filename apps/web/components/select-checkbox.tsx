"use client"

/**
 * Small accessible checkbox for row / select-all bulk selection. No shadcn
 * checkbox primitive is generated in this project, so list screens that support
 * multi-select (admissions queue + trash) share this one. Clicks stop
 * propagating so selecting a row never triggers the row's own navigation.
 */

import * as React from "react"

export interface SelectCheckboxProps {
  checked: boolean
  /** Shows the dash state when some — but not all — rows are selected. */
  indeterminate?: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: SelectCheckboxProps) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked
  }, [indeterminate, checked])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="size-4 cursor-pointer accent-primary"
    />
  )
}
