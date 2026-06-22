"use client"

/**
 * Status filter for the admissions review queue (task 2.6). Controlled string
 * select on the shared `Select` primitive; the parent owns the value and the
 * list folds it into the query params (`all` is sent as no filter — see
 * `useAdmissions`).
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import type { AdmissionStatusFilter } from "@/types/admission"

// The backend always filters by exactly one status (default `pending`), so the
// queue offers the three real lifecycle states — no "all".
const OPTIONS: { value: AdmissionStatusFilter; label: string }[] = [
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
        onValueChange((next as AdmissionStatusFilter) ?? "pending")
      }
    >
      <SelectTrigger id={id} aria-label="Filter by status" className="w-full">
        <SelectValue>
          {(selected: AdmissionStatusFilter) =>
            OPTIONS.find((o) => o.value === selected)?.label ?? "Pending"
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
