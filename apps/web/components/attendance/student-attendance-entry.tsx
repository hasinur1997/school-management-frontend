"use client"

/**
 * Student attendance entry (task 3.1): pick class/section/date, load the API
 * roster, mark students, and save. Existing marks from the sheet are loaded into
 * the segmented controls.
 *
 * Saving is partial and incremental: only marked students are sent, so a few can
 * be saved now and the rest later. The backend upserts by (enrollment, date),
 * so repeated saves merge rather than duplicate — no client-side duplicate check
 * is needed.
 *
 * UX details:
 *   - the roster is paginated client-side (`ROSTER_PAGE_SIZE` rows per page);
 *   - re-clicking the active status button clears it back to unset;
 *   - the selection (class/section/date) and any unsaved marks are persisted to
 *     localStorage so a page refresh re-opens the roster with the work intact;
 *     the draft is cleared once the day is saved.
 */

import * as React from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  useForm,
  useWatch,
  type Path,
  type UseFormReturn,
} from "react-hook-form"
import { z } from "zod"
import {
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  TriangleAlert,
  Users,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { DatePicker } from "@workspace/ui/components/date-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { ClassSelect, SectionSelect } from "@/components/academic"
import { FormBanner } from "@/components/academic/management/form-helpers"
import { usePermission } from "@/hooks/auth/use-permission"
import { STUDENT_VIEW } from "@/components/students/permissions"
import { TEACHER_VIEW } from "@/components/teachers/permissions"
import { USER_VIEW } from "@/components/users"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { ListPager } from "@/components/list-pager"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { useAttendanceSheet, useSaveAttendance } from "@/hooks/attendance"
import { isValidationError, type ApiValidationError } from "@/lib/api"
import { formatDate, formatTime } from "@/lib/format"
import { getErrorMessage, toastError, toastSuccess } from "@/lib/toast"
import type { PaginationMeta } from "@/types/api"
import {
  ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  type AttendanceSheet,
  type AttendanceSheetStudent,
  type AttendanceStatusValue,
} from "@/types/attendance"

const EMPTY = "—"

/** Roster rows shown per page (client-side pagination over the loaded sheet). */
const ROSTER_PAGE_SIZE = 10

/**
 * Idle delay before unsaved marks are autosaved. Each new mark resets the timer,
 * so a save fires only once the user pauses — not on every click.
 */
const AUTOSAVE_DELAY_MS = 3000

/**
 * Local persistence so an in-progress roster survives a page refresh: the chosen
 * class/section/date selection, plus a per-roster draft of unsaved marks keyed
 * by that selection. The draft is cleared once the day is saved to the API.
 */
const SELECTION_KEY = "attendance:selection"

interface StoredSelection {
  class_id: string | null
  section_id: string | null
  date: string
}

type StatusDraft = Partial<Record<string, AttendanceStatusValue>>

function draftKey(
  classId: string | null,
  sectionId: string | null,
  date: string
): string {
  return `attendance:draft:${classId ?? ""}|${sectionId ?? ""}|${date}`
}

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full / unavailable — drafts are best-effort */
  }
}

function removeKey(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * Class/section ids are opaque `public_id` hashes (strings). Normalise to a
 * non-empty string or `null` — never coerce to a number, which would turn a
 * hash into `NaN`.
 */
function normalizeOptionalId(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

const idSchema = z.preprocess(normalizeOptionalId, z.string().min(1).nullable())

const attendanceEntrySchema = z
  .object({
    class_id: idSchema,
    section_id: idSchema,
    date: z.string().min(1, "Select a date."),
    records: z.array(
      z.object({
        enrollment_id: z.string().min(1, "Student enrollment is missing."),
        status: z.enum(ATTENDANCE_STATUSES).nullable(),
      })
    ),
  })
  .superRefine((values, ctx) => {
    if (values.class_id == null) {
      ctx.addIssue({
        code: "custom",
        path: ["class_id"],
        message: "Select a class.",
      })
    }
    if (values.section_id == null) {
      ctx.addIssue({
        code: "custom",
        path: ["section_id"],
        message: "Select a section.",
      })
    }
    if (values.records.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["records"],
        message: "Load a roster before saving attendance.",
      })
    } else if (!values.records.some((record) => record.status != null)) {
      // Partial saves are allowed (mark some now, the rest later), but there
      // must be at least one mark to send. Unmarked students are simply left
      // out of the payload and the backend's idempotent upsert merges them in
      // on a later save without creating duplicates.
      ctx.addIssue({
        code: "custom",
        path: ["records"],
        message: "Mark at least one student before saving.",
      })
    }
  })

type AttendanceEntryInput = z.input<typeof attendanceEntrySchema>
type AttendanceEntryValues = z.output<typeof attendanceEntrySchema>
type AttendanceEntryForm = UseFormReturn<
  AttendanceEntryInput,
  unknown,
  AttendanceEntryValues
>

const SELECTED_CLASSES: Record<AttendanceStatusValue, string> = {
  present: "border-success/30 bg-success/10 text-success ring-1 ring-success/20",
  absent: "border-error/30 bg-error/10 text-error ring-1 ring-error/20",
  late: "border-warning/30 bg-warning/10 text-warning ring-1 ring-warning/20",
  leave: "border-info/30 bg-info/10 text-info ring-1 ring-info/20",
}

function todayInputValue(): string {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function studentInitials(student: AttendanceSheetStudent): string {
  const name = student.name_en?.trim()
  if (!name) return "S"
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function StudentAttendanceEntry() {
  const form = useForm<AttendanceEntryInput, unknown, AttendanceEntryValues>({
    resolver: zodResolver(attendanceEntrySchema),
    defaultValues: {
      class_id: null,
      section_id: null,
      date: todayInputValue(),
      records: [],
    },
  })

  const [banner, setBanner] = React.useState<string | null>(null)
  const [autosaveError, setAutosaveError] = React.useState(false)
  // Last status known to be persisted server-side, per enrollment. Autosave and
  // manual save only send marks that differ from this, so untouched rows keep
  // their original recorded time/by instead of being bumped to the latest save.
  const [baseline, setBaseline] = React.useState<
    Record<string, AttendanceStatusValue | null>
  >({})

  const watchedClassId = useWatch({ control: form.control, name: "class_id" })
  const watchedSectionId = useWatch({ control: form.control, name: "section_id" })
  const date = useWatch({ control: form.control, name: "date" })
  const records = useWatch({ control: form.control, name: "records" })
  const classId = normalizeOptionalId(watchedClassId)
  const sectionId = normalizeOptionalId(watchedSectionId)

  const sheetQuery = useAttendanceSheet({
    class_id: classId,
    section_id: sectionId,
    date,
  })
  const saveAttendance = useSaveAttendance()
  const sheet = sheetQuery.data
  const students = sheet?.students ?? []
  const isReady = classId != null && sectionId != null && Boolean(date)

  // Restore the last class/section/date once on mount so a refresh re-opens the
  // same roster instead of the empty setup state. Done in an effect (not the
  // form default) to avoid a server/client hydration mismatch on localStorage.
  const [restored, setRestored] = React.useState(false)
  React.useEffect(() => {
    const stored = readJSON<StoredSelection>(SELECTION_KEY)
    if (stored) {
      if (stored.class_id) form.setValue("class_id", stored.class_id)
      if (stored.section_id) form.setValue("section_id", stored.section_id)
      if (stored.date) form.setValue("date", stored.date)
    }
    setRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist the selection whenever it changes (after the initial restore).
  React.useEffect(() => {
    if (!restored) return
    writeJSON(SELECTION_KEY, { class_id: classId, section_id: sectionId, date })
  }, [restored, classId, sectionId, date])

  // Seed the records from the loaded sheet, overlaying any unsaved draft marks
  // for this exact class/section/date so refreshing mid-entry keeps them.
  React.useEffect(() => {
    if (!sheet) return

    // Baseline is the server's truth; the draft overlay on top represents
    // unsaved marks, which autosave will pick up and persist.
    setBaseline(
      Object.fromEntries(
        sheet.students.map((student) => [student.enrollment_id, student.status])
      )
    )
    setAutosaveError(false)

    const draft = readJSON<StatusDraft>(draftKey(classId, sectionId, date))
    form.setValue(
      "records",
      sheet.students.map((student) => ({
        enrollment_id: student.enrollment_id,
        status: draft?.[student.enrollment_id] ?? student.status,
      })),
      { shouldDirty: false, shouldTouch: false, shouldValidate: false }
    )
    form.clearErrors("records")
  }, [form, sheet, classId, sectionId, date])

  // Persist set marks as a draft whenever they change, so they survive refresh
  // until the day is saved. Skipped while the roster is empty/transitioning so
  // switching selection never wipes a stored draft.
  React.useEffect(() => {
    if (!restored || !isReady || records.length === 0) return
    const draft: StatusDraft = {}
    for (const record of records) {
      if (record.status) draft[record.enrollment_id] = record.status
    }
    writeJSON(draftKey(classId, sectionId, date), draft)
  }, [restored, records, isReady, classId, sectionId, date])

  // Marks that differ from the server baseline — i.e. set rows not yet saved.
  const pendingCount = sheet ? diffMarks(records, baseline).length : 0
  const hasAnyMark = records.some((record) => record.status != null)

  // Autosave: once the roster is idle for `AUTOSAVE_DELAY_MS` with unsaved
  // marks, push them so a teacher who forgets to click Save doesn't lose work.
  // Only changed marks gate the timer; the backend's idempotent upsert merges.
  React.useEffect(() => {
    if (!restored || !isReady || !sheet || sectionId == null) return
    if (saveAttendance.isPending || pendingCount === 0) return

    const timer = setTimeout(() => {
      const changed = diffMarks(records, baseline)
      if (changed.length === 0) return

      setAutosaveError(false)
      saveAttendance.mutate(
        {
          section_id: sectionId,
          date,
          records: changed.map((record) => ({
            enrollment_id: record.enrollment_id,
            status: record.status,
          })),
        },
        {
          onSuccess: (saved) => {
            setBaseline((prev) => {
              const next = { ...prev }
              for (const record of changed) next[record.enrollment_id] = record.status
              return next
            })
            toastSuccess(`Autosaved ${saved.saved} students.`, {
              id: "attendance-autosave",
            })
            // Pull the server's per-row recorded time/by for the just-saved
            // rows so each shows its own timestamp, not the latest save's.
            void sheetQuery.refetch()
          },
          onError: (error) => {
            setAutosaveError(true)
            toastError(error, "Couldn't autosave — click Save to retry.", {
              id: "attendance-autosave",
            })
          },
        }
      )
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, isReady, sheet, sectionId, date, records, baseline, pendingCount])

  function changeClass(value: string | null) {
    form.setValue("class_id", normalizeOptionalId(value), {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
    form.setValue("section_id", null, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
    form.setValue("records", [], { shouldDirty: true, shouldValidate: false })
    setBanner(null)
  }

  function changeSection(value: string | null) {
    form.setValue("section_id", normalizeOptionalId(value), {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
    form.setValue("records", [], { shouldDirty: true, shouldValidate: false })
    setBanner(null)
  }

  function changeDate(value: string) {
    form.setValue("date", value, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
    form.setValue("records", [], { shouldDirty: true, shouldValidate: false })
    setBanner(null)
  }

  function markAllPresent() {
    if (!sheet) return
    form.setValue(
      "records",
      sheet.students.map((student) => ({
        enrollment_id: student.enrollment_id,
        status: "present",
      })),
      { shouldDirty: true, shouldTouch: true, shouldValidate: true }
    )
    setBanner(null)
  }

  async function onSubmit(values: AttendanceEntryValues) {
    setBanner(null)

    const result = attendanceEntrySchema.safeParse(values)
    if (!result.success) {
      const firstIssue = result.error.issues.find(
        (issue) => typeof issue.message === "string" && issue.message
      )
      setBanner(firstIssue?.message ?? "Check the attendance details and try again.")
      return
    }

    const section_id = result.data.section_id
    if (section_id == null) return

    // Send only marks that changed since the last save — unmarked rows are left
    // for later, and already-saved rows are skipped so their recorded time/by
    // stay as they were first recorded.
    const changed = diffMarks(result.data.records, baseline)
    if (changed.length === 0) {
      const anyMark = result.data.records.some((record) => record.status != null)
      setBanner(
        anyMark
          ? "Attendance is already up to date — nothing new to save."
          : "Mark at least one student before saving."
      )
      return
    }

    const body = {
      section_id,
      date: result.data.date,
      records: changed.map((record) => ({
        enrollment_id: record.enrollment_id,
        status: record.status,
      })),
    }

    try {
      const saved = await saveAttendance.mutateAsync(body)
      toastSuccess(`Attendance saved for ${saved.saved} students.`, {
        id: "attendance-save",
      })
      // Mark these as the new baseline so they aren't resent, then drop the
      // local draft — the refetched server marks become the source of truth.
      setBaseline((prev) => {
        const next = { ...prev }
        for (const record of changed) next[record.enrollment_id] = record.status
        return next
      })
      removeKey(draftKey(classId, sectionId, date))
      await sheetQuery.refetch()
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyAttendanceFieldErrors(form, error, records.length)
        setBanner(
          mapped
            ? error.message
            : getErrorMessage(error, "Couldn't save attendance.")
        )
      } else {
        setBanner(getErrorMessage(error, "Couldn't save attendance."))
      }
      toastError(error, "Couldn't save attendance.", { id: "attendance-save" })
    }
  }

  function onInvalid() {
    setBanner(attendanceBannerMessage(form))
  }

  const statusCounts = countStatuses(records)
  const unsetCount = records.filter((record) => record.status == null).length

  return (
    <Form {...form}>
      <form
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-copy-primary">
              Student attendance
            </h1>
            <p className="text-sm text-copy-muted">
              Record or update a daily class roster.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              type="submit"
              loading={saveAttendance.isPending}
              disabled={!sheet || students.length === 0}
              className="w-full sm:w-auto"
            >
              <ClipboardCheck className="size-4" aria-hidden />
              Save attendance
            </Button>
            {isReady && students.length > 0 ? (
              <AutosaveStatus
                saving={saveAttendance.isPending}
                pendingCount={pendingCount}
                hasAnyMark={hasAnyMark}
                error={autosaveError}
              />
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FormField
              control={form.control}
              name="class_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <FormControl>
                    <ClassSelect
                      value={normalizeOptionalId(field.value)}
                      onValueChange={changeClass}
                      aria-label="Select class"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="section_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <FormControl>
                    <SectionSelect
                      classId={classId}
                      value={normalizeOptionalId(field.value)}
                      onValueChange={changeSection}
                      aria-label="Select section"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onValueChange={changeDate}
                      onBlur={field.onBlur}
                      name={field.name}
                      placeholder="Select date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormBanner message={banner} />

        {!isReady ? (
          <EmptyState
            icon={CalendarCheck}
            title="Choose a class, section, and date"
            description="The attendance roster loads after all three fields are selected."
          />
        ) : sheetQuery.isPending ? (
          <TableSkeleton rows={8} columns={5} />
        ) : sheetQuery.isError ? (
          <ErrorPanel
            description={getErrorMessage(
              sheetQuery.error,
              "We couldn't load the attendance roster."
            )}
            onRetry={() => void sheetQuery.refetch()}
          />
        ) : students.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students in this roster"
            description="The API did not return any active students for this section and date."
          />
        ) : (
          <RosterPanel
            sheet={sheet as AttendanceSheet}
            form={form}
            statusCounts={statusCounts}
            unsetCount={unsetCount}
            isFetching={sheetQuery.isFetching}
            isSaving={saveAttendance.isPending}
            onMarkAllPresent={markAllPresent}
          />
        )}
      </form>
    </Form>
  )
}

function RosterPanel({
  sheet,
  form,
  statusCounts,
  unsetCount,
  isFetching,
  isSaving,
  onMarkAllPresent,
}: {
  sheet: AttendanceSheet
  form: AttendanceEntryForm
  statusCounts: Record<AttendanceStatusValue, number>
  unsetCount: number
  isFetching: boolean
  isSaving: boolean
  onMarkAllPresent: () => void
}) {
  const total = sheet.students.length
  const lastPage = Math.max(1, Math.ceil(total / ROSTER_PAGE_SIZE))
  const [page, setPage] = React.useState(1)

  // Reset to the first page whenever the roster identity changes (new
  // section/date), and clamp if the current page falls out of range.
  React.useEffect(() => {
    setPage(1)
  }, [sheet.section, sheet.date])
  React.useEffect(() => {
    setPage((current) => Math.min(current, lastPage))
  }, [lastPage])

  const start = (page - 1) * ROSTER_PAGE_SIZE
  const end = start + ROSTER_PAGE_SIZE
  // Keep each student's global index so the form path (`records.${index}`) and
  // its existing draft/validation stay aligned across pages.
  const pageStudents = sheet.students
    .map((student, index) => ({ student, index }))
    .slice(start, end)

  const pagerMeta: PaginationMeta = {
    current_page: page,
    per_page: ROSTER_PAGE_SIZE,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(end, total),
    total,
    last_page: lastPage,
  }

  // Gate the row links so a viewer who can't reach the target page sees plain
  // text instead of a dead click landing on an access-denied screen.
  const canViewStudent = usePermission(STUDENT_VIEW)
  const canViewTeacher = usePermission(TEACHER_VIEW)
  const canViewUser = usePermission(USER_VIEW)

  return (
    <div className="flex flex-col gap-3" aria-busy={isFetching || isSaving}>
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-copy-primary">
              {sheet.class || EMPTY} · {sheet.section || EMPTY}
            </h2>
            {isFetching ? (
              <Loader2
                className="size-4 animate-spin text-copy-muted"
                aria-label="Refreshing"
              />
            ) : null}
          </div>
          <p className="text-sm text-copy-muted">
            {formatDate(sheet.date)} · {sheet.students.length} students
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_STATUSES.map((status) => (
              <StatusBadge
                key={status}
                status={status}
                label={`${attendanceStatusLabel(status)} ${statusCounts[status]}`}
              />
            ))}
            {unsetCount > 0 ? (
              <StatusBadge
                status="unset"
                tone="neutral"
                label={`Unset ${unsetCount}`}
              />
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onMarkAllPresent}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Mark all present
          </Button>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40">Recorded by</TableHead>
              <TableHead className="w-28 text-right">Recorded at</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageStudents.map(({ student, index }) => (
              <TableRow key={student.enrollment_id}>
                <TableCell className="font-mono text-copy-secondary">
                  {student.roll_no ?? EMPTY}
                </TableCell>
                <TableCell>
                  <RosterStudent student={student} canView={canViewStudent} />
                </TableCell>
                <TableCell>
                  <StatusField
                    form={form}
                    index={index}
                    disabled={isSaving}
                  />
                </TableCell>
                <TableCell className="text-sm text-copy-secondary">
                  <RecordedBy
                    student={student}
                    canViewTeacher={canViewTeacher}
                    canViewUser={canViewUser}
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm whitespace-nowrap text-copy-muted">
                  {formatTime(student.recorded_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-surface-border px-6 py-3.5">
          <ListPager
            meta={pagerMeta}
            page={page}
            lastPage={lastPage}
            unit="student"
            disabled={isFetching || isSaving}
            onPage={setPage}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {pageStudents.map(({ student, index }) => (
          <li
            key={student.enrollment_id}
            className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <RosterStudent student={student} canView={canViewStudent} />
              <span className="shrink-0 rounded-md bg-subtle px-2 py-1 font-mono text-xs text-copy-secondary">
                Roll {student.roll_no ?? EMPTY}
              </span>
            </div>
            <StatusField form={form} index={index} disabled={isSaving} />
            {student.recorded_at || student.recorded_by ? (
              <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs text-copy-muted">
                <span>
                  Recorded by{" "}
                  <RecordedBy
                    student={student}
                    canViewTeacher={canViewTeacher}
                    canViewUser={canViewUser}
                  />
                </span>
                <span className="font-mono">{formatTime(student.recorded_at)}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="md:hidden">
        <ListPager
          meta={pagerMeta}
          page={page}
          lastPage={lastPage}
          unit="student"
          disabled={isFetching || isSaving}
          onPage={setPage}
        />
      </div>
    </div>
  )
}

/**
 * Compact autosave indicator shown under the Save button: reflects whether marks
 * are saving, queued for autosave, fully saved, or failed.
 */
function AutosaveStatus({
  saving,
  pendingCount,
  hasAnyMark,
  error,
}: {
  saving: boolean
  pendingCount: number
  hasAnyMark: boolean
  error: boolean
}) {
  let content: React.ReactNode = null

  if (saving) {
    content = (
      <>
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Saving…
      </>
    )
  } else if (error) {
    content = (
      <span className="inline-flex items-center gap-1.5 text-error">
        <TriangleAlert className="size-3.5" aria-hidden />
        Autosave failed — click Save
      </span>
    )
  } else if (pendingCount > 0) {
    content = (
      <>
        <span
          className="size-2 rounded-full bg-warning"
          aria-hidden
        />
        Unsaved changes — autosaving…
      </>
    )
  } else if (hasAnyMark) {
    content = (
      <span className="inline-flex items-center gap-1.5 text-success">
        <CheckCircle2 className="size-3.5" aria-hidden />
        All changes saved
      </span>
    )
  }

  if (!content) return null

  return (
    <p
      className="inline-flex items-center gap-1.5 text-xs text-copy-muted"
      role="status"
      aria-live="polite"
    >
      {content}
    </p>
  )
}

function RosterStudent({
  student,
  canView,
}: {
  student: AttendanceSheetStudent
  canView: boolean
}) {
  const name = student.name_en || EMPTY
  const linkable = canView && Boolean(student.student_id)

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        {student.photo_url ? <AvatarImage src={student.photo_url} alt="" /> : null}
        <AvatarFallback>{studentInitials(student)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        {linkable ? (
          <Link
            href={`/students/${student.student_id}`}
            className="truncate font-medium text-copy-primary hover:text-primary hover:underline"
          >
            {name}
          </Link>
        ) : (
          <p className="truncate font-medium text-copy-primary">{name}</p>
        )}
        <p className="truncate text-xs text-copy-muted">
          Enrollment {student.enrollment_id}
        </p>
      </div>
    </div>
  )
}

/**
 * The "recorded by" name, linked to the recorder's profile when the viewer can
 * reach it: a teacher recorder links to the teacher detail page, anyone else to
 * the user profile page. Without the relevant permission (or no recorder yet) it
 * renders as plain text.
 */
function RecordedBy({
  student,
  canViewTeacher,
  canViewUser,
}: {
  student: AttendanceSheetStudent
  canViewTeacher: boolean
  canViewUser: boolean
}) {
  const name = student.recorded_by
  if (!name) return <span className="text-copy-muted">{EMPTY}</span>

  let href: string | null = null
  if (student.recorded_by_teacher_id && canViewTeacher) {
    href = `/teachers/${student.recorded_by_teacher_id}`
  } else if (student.recorded_by_user_id && canViewUser) {
    href = `/users/${student.recorded_by_user_id}`
  }

  if (!href) return <span className="text-copy-secondary">{name}</span>

  return (
    <Link
      href={href}
      className="text-copy-secondary hover:text-primary hover:underline"
    >
      {name}
    </Link>
  )
}

function StatusField({
  form,
  index,
  disabled,
}: {
  form: AttendanceEntryForm
  index: number
  disabled: boolean
}) {
  const name = `records.${index}.status` as Path<AttendanceEntryInput>

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormControl>
            <StatusSegment
              value={field.value as AttendanceStatusValue | null}
              onValueChange={(value) =>
                // Re-clicking the current status clears it back to unset.
                field.onChange(field.value === value ? null : value)
              }
              disabled={disabled}
              invalid={Boolean(fieldState.error)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function StatusSegment({
  value,
  onValueChange,
  disabled,
  invalid,
}: {
  value: AttendanceStatusValue | null
  onValueChange: (value: AttendanceStatusValue) => void
  disabled: boolean
  invalid: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Attendance status"
      data-invalid={invalid || undefined}
      className="grid grid-cols-2 gap-1.5 sm:inline-grid sm:grid-cols-4"
    >
      {ATTENDANCE_STATUSES.map((status) => {
        const selected = value === status
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onValueChange(status)}
            className={cn(
              "h-9 rounded-md border px-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? SELECTED_CLASSES[status]
                : "border-surface-border bg-surface text-copy-secondary hover:bg-subtle",
              invalid && !selected && "border-error/40"
            )}
          >
            {attendanceStatusLabel(status)}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Build a single, specific banner message from the form's validation state —
 * surface the first thing the user needs to fix (pick a class/section/date, or
 * mark a student) instead of a vague "complete the fields".
 */
function attendanceBannerMessage(form: AttendanceEntryForm): string {
  const errors = form.formState.errors
  const pick = (message: unknown): string | null =>
    typeof message === "string" && message ? message : null

  return (
    pick(errors.class_id?.message) ??
    pick(errors.section_id?.message) ??
    pick(errors.date?.message) ??
    pick(errors.records?.message) ??
    "Mark at least one student before saving."
  )
}

/**
 * The marked rows whose status differs from the server baseline — i.e. the only
 * rows worth sending. Resending unchanged rows would bump their `recorded_at` /
 * `recorded_by` on the backend's upsert, making every row look saved at the same
 * (latest) time, so we never include them.
 */
function diffMarks(
  records: AttendanceEntryValues["records"],
  baseline: Record<string, AttendanceStatusValue | null>
): { enrollment_id: string; status: AttendanceStatusValue }[] {
  return records.filter(
    (record): record is { enrollment_id: string; status: AttendanceStatusValue } =>
      record.status != null && record.status !== baseline[record.enrollment_id]
  )
}

function countStatuses(records: AttendanceEntryValues["records"]) {
  return ATTENDANCE_STATUSES.reduce(
    (acc, status) => {
      acc[status] = records.filter((record) => record.status === status).length
      return acc
    },
    { present: 0, absent: 0, late: 0, leave: 0 } as Record<
      AttendanceStatusValue,
      number
    >
  )
}

function applyAttendanceFieldErrors(
  form: AttendanceEntryForm,
  error: ApiValidationError,
  recordCount: number
): boolean {
  let mapped = false
  const fields: Path<AttendanceEntryInput>[] = [
    "class_id",
    "section_id",
    "date",
    "records",
  ]

  for (let index = 0; index < recordCount; index += 1) {
    fields.push(`records.${index}.enrollment_id` as Path<AttendanceEntryInput>)
    fields.push(`records.${index}.status` as Path<AttendanceEntryInput>)
  }

  for (const field of fields) {
    const message = error.first(field)
    if (!message) continue
    form.setError(field, { message }, { shouldFocus: !mapped })
    mapped = true
  }

  return mapped
}
