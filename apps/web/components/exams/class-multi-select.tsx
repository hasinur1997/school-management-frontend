"use client"

/**
 * `ClassMultiSelect` — the class targeting control for the exam form (task 4.1).
 * An exam applies to all classes in the branch (the "All classes" toggle) or to
 * an explicit set picked from chips. Backed by `useClasses` (the shared academic
 * selector source) and fully controlled by the parent.
 *
 * When `allClasses` is on, the individual chips are disabled — the exam covers
 * every class, including ones added later, so no explicit list is kept.
 */

import { Check, Loader2 } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { useClasses } from "@/hooks/academic"

export interface ClassMultiSelectProps {
  /** Selected class ids (public_id hashes). Ignored while `allClasses` is on. */
  value: string[]
  onChange: (value: string[]) => void
  allClasses: boolean
  onAllClassesChange: (all: boolean) => void
  disabled?: boolean
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

export function ClassMultiSelect({
  value,
  onChange,
  allClasses,
  onAllClassesChange,
  disabled = false,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ClassMultiSelectProps) {
  const { data, isLoading, isError } = useClasses()
  const classes = data ?? []

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-input p-3",
        ariaInvalid && "border-destructive ring-3 ring-destructive/20",
      )}
      aria-describedby={ariaDescribedBy}
    >
      <Chip
        label="All classes"
        selected={allClasses}
        disabled={disabled}
        onClick={() => onAllClassesChange(!allClasses)}
      />

      <div className="h-px bg-surface-border" aria-hidden />

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-copy-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading classes…
        </p>
      ) : isError ? (
        <p className="text-sm text-destructive">Couldn&apos;t load classes.</p>
      ) : classes.length === 0 ? (
        <p className="text-sm text-copy-muted">No classes available.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {classes.map((schoolClass) => (
            <Chip
              key={schoolClass.id}
              label={schoolClass.name || `Class #${schoolClass.id}`}
              selected={!allClasses && value.includes(schoolClass.id)}
              disabled={disabled || allClasses}
              onClick={() => toggle(schoolClass.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-transparent text-foreground hover:bg-subtle",
      )}
    >
      {selected ? <Check className="size-3.5" aria-hidden /> : null}
      {label}
    </button>
  )
}
