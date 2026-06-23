"use client"

/**
 * Status filter for the admissions review queue (task 2.6). Controlled string
 * select on the shared `Select` primitive; the parent owns the value and the
 * list folds it into the query params. Defaults to `all` (sent as no filter — see
 * `useAdmissions`) so the queue lists every application.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type { AdmissionStatusFilter } from "@/types/admission"

// The queue lists every application by default (`all`), with the three real
// lifecycle states to narrow to.
const OPTIONS: { value: AdmissionStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

export interface AdmissionStatusFilterProps {
  value: AdmissionStatusFilter
  onValueChange: (value: AdmissionStatusFilter) => void
  id?: string
}

export function AdmissionStatusFilter({
  value,
  onValueChange,
  id,
}: AdmissionStatusFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) =>
        onValueChange((next as AdmissionStatusFilter) ?? "all")
      }
    >
      <SelectTrigger id={id} aria-label="Filter by status" className="w-full">
        <SelectValue>
          {(selected: AdmissionStatusFilter) =>
            OPTIONS.find((o) => o.value === selected)?.label ?? "All statuses"
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
