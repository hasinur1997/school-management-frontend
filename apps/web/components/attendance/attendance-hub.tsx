"use client"

/**
 * Staff attendance hub (task 3.2): the daily entry roster (task 3.1) and the
 * read-only class monthly sheet, as tabs. The Entry tab is shown only with
 * `attendance.create`; the Class sheet with `attendance.view`. In practice every
 * staff role that records attendance also holds view, so both usually appear.
 */

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

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

  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // With a single available surface, skip the tab chrome entirely.
  if (!canCreate || !canView) {
    return canCreate ? <StudentAttendanceEntry /> : <ClassAttendanceSheet />
  }

  const fromUrl = params.get("view")
  const active = fromUrl === "entry" || fromUrl === "class-sheet" ? fromUrl : defaultTab

  const onValueChange = (next: string) => {
    const search = new URLSearchParams(params.toString())
    search.set("view", next)
    router.replace(`${pathname}?${search.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={active} onValueChange={onValueChange} className="gap-6">
      <TabsList className="inline-flex h-auto w-fit gap-1 rounded-xl bg-subtle p-1">
        <TabsTrigger
          value="entry"
          className="h-9 flex-none rounded-lg px-4 text-sm font-medium text-copy-muted data-active:bg-surface data-active:text-copy-primary data-active:shadow-sm"
        >
          Entry
        </TabsTrigger>
        <TabsTrigger
          value="class-sheet"
          className="h-9 flex-none rounded-lg px-4 text-sm font-medium text-copy-muted data-active:bg-surface data-active:text-copy-primary data-active:shadow-sm"
        >
          Class sheet
        </TabsTrigger>
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
