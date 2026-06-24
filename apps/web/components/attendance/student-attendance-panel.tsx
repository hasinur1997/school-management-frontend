"use client"

/**
 * Embeddable per-student monthly attendance (task 3.2/3.4): the same
 * `GET /students/{id}/attendance` sheet as `StudentAttendanceSheet`, but without
 * the identity hero or page layout so it can drop straight into the student
 * detail page's "Attendance" tab (the hero already provides the context there).
 * Month state is local; the API owns the summary totals.
 */

import * as React from "react"

import { useStudentMonthlyAttendance } from "@/hooks/attendance"
import { currentMonth } from "@/lib/attendance/month"
import { MonthlySheetFrame } from "./monthly-sheet-frame"

export function StudentAttendancePanel({ studentId }: { studentId: string }) {
  const [period, setPeriod] = React.useState(currentMonth)
  const query = useStudentMonthlyAttendance(studentId, period)

  return (
    <MonthlySheetFrame
      title="Monthly attendance"
      subtitle="Monthly attendance record"
      year={period.year}
      month={period.month}
      onMonthChange={setPeriod}
      query={query}
      notFoundTitle="Attendance not available"
      notFoundDescription="This student's attendance doesn't exist or you don't have access to it."
    />
  )
}
