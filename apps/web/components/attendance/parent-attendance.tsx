"use client"

/**
 * Parent attendance (task 3.2): a child selector over the parent's linked
 * children (`GET /me/students`) feeding the per-student monthly sheet
 * (`GET /students/{id}/attendance`). Switching child re-queries; the API
 * authorizes the linked parent and hides anything else as 404.
 */

import * as React from "react"
import { Lock, Users } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { useMyStudents } from "@/hooks/parents"
import { useStudentMonthlyAttendance } from "@/hooks/attendance"
import { isForbiddenError } from "@/lib/api"
import { getErrorMessage } from "@/lib/toast"
import { currentMonth } from "@/lib/attendance/month"
import { linkedStudentLabel, linkedStudentMeta } from "@/types/parent"
import { MonthlySheetFrame } from "./monthly-sheet-frame"

export function ParentAttendance() {
  const childrenQuery = useMyStudents()
  const children = childrenQuery.data ?? []

  const [pickedId, setPickedId] = React.useState<string | null>(null)
  const [period, setPeriod] = React.useState(currentMonth)

  // Derive the effective child from the explicit pick, falling back to the first
  // linked child (and recovering if a picked child is unlinked). Derivation
  // avoids an effect/setState round-trip when the children load.
  const selectedId =
    pickedId && children.some((child) => child.id === pickedId)
      ? pickedId
      : (children[0]?.id ?? null)

  const attendance = useStudentMonthlyAttendance(selectedId, period)

  if (childrenQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    )
  }

  if (childrenQuery.isError) {
    return isForbiddenError(childrenQuery.error) ? (
      <EmptyState
        icon={Lock}
        title="No linked children"
        description="Attendance for children is available to parent accounts only."
      />
    ) : (
      <ErrorPanel
        description={getErrorMessage(
          childrenQuery.error,
          "We couldn't load your children."
        )}
        onRetry={childrenQuery.refetch}
      />
    )
  }

  if (children.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No linked children"
        description="No students are linked to your account yet. Contact the school office to get linked."
      />
    )
  }

  return (
    <MonthlySheetFrame
      title="Children's attendance"
      subtitle="Monthly attendance record"
      aside={
        <Select
          value={selectedId ?? undefined}
          onValueChange={(next) => setPickedId(next ?? null)}
        >
          <SelectTrigger aria-label="Select child" className="w-full sm:w-56">
            <SelectValue>
              {(value: string | undefined) => {
                const child = children.find((entry) => entry.id === value)
                return child ? linkedStudentLabel(child) : "Select child"
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {children.map((child) => (
              <SelectItem key={child.id} value={child.id}>
                <span className="flex flex-col">
                  <span className="font-medium">{linkedStudentLabel(child)}</span>
                  <span className="text-xs text-copy-muted">
                    {linkedStudentMeta(child)}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      year={period.year}
      month={period.month}
      onMonthChange={setPeriod}
      query={attendance}
      notFoundTitle="Attendance not available"
      notFoundDescription="This child's attendance doesn't exist or you don't have access to it."
    />
  )
}
