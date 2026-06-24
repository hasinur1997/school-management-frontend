"use client"

/**
 * Per-student monthly attendance sheet (task 3.2), reached via
 * `/attendance?student={id}` from the student detail page and the parent's
 * linked-children list. Reads `GET /students/{id}/attendance`, which the API
 * authorizes for staff, the student itself, or a linked parent (denials hide as
 * 404). Month state is local; the API owns the summary totals.
 *
 * A student profile card (the shared detail hero) sits at the top so the sheet
 * carries the same identity context as the detail page. It reads `GET
 * /students/{id}` — authorized for the same audiences — and is skipped silently
 * if that record isn't accessible, leaving the attendance sheet intact.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { Button } from "@/components/button"
import { DetailHero, DetailLayout } from "@/components/detail/detail-ui"
import { useStudentMonthlyAttendance } from "@/hooks/attendance"
import { useStudent } from "@/hooks/students"
import { formatDate } from "@/lib/format"
import { currentMonth } from "@/lib/attendance/month"
import {
  isTcStudent,
  studentDisplayName,
  studentInitials,
  studentStatusLabel,
} from "@/types/student"
import { MonthlySheetFrame } from "./monthly-sheet-frame"

export function StudentAttendanceSheet({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [period, setPeriod] = React.useState(currentMonth)
  const query = useStudentMonthlyAttendance(studentId, period)
  const student = useStudent(studentId)

  return (
    <DetailLayout>
      {student.isPending ? (
        <Skeleton className="mb-5 h-47 w-full rounded-2xl" />
      ) : student.data ? (
        <StudentProfileCard student={student.data} />
      ) : null}

      <MonthlySheetFrame
        title="Monthly attendance"
        subtitle="Monthly attendance record"
        aside={
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back
          </Button>
        }
        year={period.year}
        month={period.month}
        onMonthChange={setPeriod}
        query={query}
        notFoundTitle="Attendance not available"
        notFoundDescription="This student's attendance doesn't exist or you don't have access to it."
      />
    </DetailLayout>
  )
}

function StudentProfileCard({
  student,
}: {
  student: NonNullable<ReturnType<typeof useStudent>["data"]>
}) {
  const tc = isTcStudent(student.status)
  const active = student.status === "active"
  const tone = tc ? "info" : active ? "success" : "error"

  // Class / section / roll come from the current enrollment (the active one, or
  // the most recent the API returns first).
  const current =
    student.enrollments?.find((e) => e.status === "active") ??
    student.enrollments?.[0] ??
    null

  return (
    <DetailHero
      tone={tone}
      statusLabel={studentStatusLabel(student.status)}
      photo={student.photo_url}
      initials={studentInitials(student)}
      title={studentDisplayName(student)}
      subtitle={
        <>
          {student.name_bn && student.name_en ? (
            <p className="text-[15px] text-copy-secondary">{student.name_bn}</p>
          ) : null}
          <p className="text-[13px] text-copy-muted">
            {student.admission_no ? `Admission ${student.admission_no}` : "Student"}
          </p>
        </>
      }
      facts={[
        { label: "Class", value: current?.class?.name },
        { label: "Section", value: current?.section?.name },
        {
          label: "Roll no",
          value: current?.roll_no != null ? String(current.roll_no) : null,
          mono: true,
        },
        {
          label: "Admitted",
          value: student.admitted_at ? formatDate(student.admitted_at) : null,
        },
      ]}
    />
  )
}
