"use client"

/**
 * Staff attendance hub (task 3.2): the daily entry roster (task 3.1) and the
 * read-only class monthly sheet, as tabs. The Entry tab is shown only with
 * `attendance.create`; the Class sheet with `attendance.view`. In practice every
 * staff role that records attendance also holds view, so both usually appear.
 */

import * as React from "react"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { StudentAttendanceEntry } from "./student-attendance-entry"
import { ClassAttendanceSheet } from "./class-attendance-sheet"

export function AttendanceHub({
  canCreate,
  canView,
}: {
  canCreate: boolean
  canView: boolean
}) {
  const defaultTab = canCreate ? "entry" : "class-sheet"

  // With a single available surface, skip the tab chrome entirely.
  if (!canCreate || !canView) {
    return canCreate ? <StudentAttendanceEntry /> : <ClassAttendanceSheet />
  }

  return (
    <Tabs defaultValue={defaultTab} className="gap-6">
      <TabsList>
        <TabsTrigger value="entry">Entry</TabsTrigger>
        <TabsTrigger value="class-sheet">Class sheet</TabsTrigger>
      </TabsList>
      <TabsContent value="entry">
        <StudentAttendanceEntry />
      </TabsContent>
      <TabsContent value="class-sheet">
        <ClassAttendanceSheet />
      </TabsContent>
    </Tabs>
  )
}
