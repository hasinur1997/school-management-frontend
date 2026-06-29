"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarCheck, Check, Pencil, Search, SlidersHorizontal } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { cn } from "@workspace/ui/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Button } from "@/components/button"
import { FormBanner, applyFieldErrors } from "@/components/academic/management/form-helpers"
import { TeacherSelect } from "@/components/teachers/teacher-select"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { ListPager } from "@/components/list-pager"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { usePermission } from "@/hooks/auth/use-permission"
import {
  TEACHER_ATTENDANCE_PER_PAGE,
  useCorrectTeacherAttendance,
  useTeacherAttendanceList,
} from "@/hooks/teacher-attendance"
import { isValidationError } from "@/lib/api"
import { formatDate, formatTime } from "@/lib/format"
import { getErrorMessage, toastError, toastSuccess } from "@/lib/toast"
import {
  ATTENDANCE_STATUSES,
  attendanceStatusLabel,
  type AttendanceStatusValue,
} from "@/types/attendance"
import type { TeacherAttendanceRecord } from "@/types/teacher-attendance"
import type { PaginationMeta } from "@/types/api"
import { TEACHER_ATTENDANCE_MANAGE } from "./permissions"

const EMPTY = "—"
const ALL_STATUSES = "__all__"

const correctionSchema = z
  .object({
    status: z.enum(ATTENDANCE_STATUSES),
    check_in_at: z.string().optional(),
    check_out_at: z.string().optional(),
  })
  .refine(
    (value) => {
      if (!value.check_in_at || !value.check_out_at) return true
      return new Date(value.check_out_at).getTime() > new Date(value.check_in_at).getTime()
    },
    {
      path: ["check_out_at"],
      message: "Check-out must be after check-in.",
    }
  )

type CorrectionValues = z.infer<typeof correctionSchema>

export function TeacherAttendanceAdmin({
  initialTeacherId = null,
}: {
  initialTeacherId?: string | null
}) {
  const canManage = usePermission(TEACHER_ATTENDANCE_MANAGE)
  const [teacherId, setTeacherId] = React.useState<string | null>(initialTeacherId)
  const [date, setDate] = React.useState("")
  const [status, setStatus] = React.useState<AttendanceStatusValue | null>(null)
  const [page, setPage] = React.useState(1)
  const [editing, setEditing] = React.useState<TeacherAttendanceRecord | null>(null)

  const records = useTeacherAttendanceList({
    teacher_id: teacherId,
    date: date || null,
    status,
    page,
    per_page: TEACHER_ATTENDANCE_PER_PAGE,
  })

  const rows = records.data?.data ?? []
  const meta = records.data?.meta
  const isFiltered = Boolean(teacherId || date || status)

  function clearFilters() {
    setTeacherId(null)
    setDate("")
    setStatus(null)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-copy-primary">
            Teacher attendance
          </h1>
          <p className="text-sm text-copy-muted">
            Review daily teacher records and correct check-in or check-out details.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-copy-muted" aria-hidden />
            Filters
          </CardTitle>
          <CardDescription>Filter by teacher, date, or attendance status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-copy-primary" htmlFor="teacher-attendance-teacher">
                Teacher
              </label>
              <TeacherSelect
                id="teacher-attendance-teacher"
                value={teacherId}
                onValueChange={(value) => {
                  setTeacherId(value)
                  setPage(1)
                }}
                placeholder="All teachers"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-copy-primary" htmlFor="teacher-attendance-date">
                Date
              </label>
              <Input
                id="teacher-attendance-date"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value)
                  setPage(1)
                }}
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-copy-primary" htmlFor="teacher-attendance-status">
                Status
              </label>
              <Select
                value={status ?? ALL_STATUSES}
                onValueChange={(value) => {
                  setStatus(value === ALL_STATUSES ? null : (value as AttendanceStatusValue))
                  setPage(1)
                }}
              >
                <SelectTrigger id="teacher-attendance-status" className="h-11">
                  <SelectValue>
                    {(v: string) =>
                      v === ALL_STATUSES
                        ? "All statuses"
                        : attendanceStatusLabel(v as AttendanceStatusValue)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                  {ATTENDANCE_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {attendanceStatusLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={!isFiltered || records.isFetching}
              className="h-11"
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {records.isPending ? (
        <TableSkeleton rows={8} columns={6} />
      ) : records.isError ? (
        <ErrorPanel
          description={getErrorMessage(records.error, "We couldn't load teacher attendance.")}
          onRetry={() => void records.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title={isFiltered ? "No matching records" : "No teacher attendance yet"}
          description={
            isFiltered
              ? "No teacher attendance records match the current filters."
              : "Teacher check-ins will appear here after they are recorded."
          }
        />
      ) : (
        <TeacherAttendanceTable
          records={rows}
          canManage={canManage}
          isFetching={records.isFetching}
          meta={meta}
          page={page}
          onPage={setPage}
          onEdit={setEditing}
        />
      )}

      {editing ? (
        <TeacherAttendanceCorrectionDialog
          key={editing.id}
          record={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function TeacherAttendanceTable({
  records,
  canManage,
  isFetching,
  meta,
  page,
  onPage,
  onEdit,
}: {
  records: TeacherAttendanceRecord[]
  canManage: boolean
  isFetching: boolean
  meta: PaginationMeta | undefined
  page: number
  onPage: (page: number) => void
  onEdit: (record: TeacherAttendanceRecord) => void
}) {
  const lastPage = meta?.last_page ?? 1

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Teacher</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Corrected by</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id} className={cn(isFetching && "opacity-70")}>
                <TableCell className="font-medium text-copy-primary">
                  {record.teacher?.name ?? EMPTY}
                </TableCell>
                <TableCell className="tabular-nums">{formatDate(record.date)}</TableCell>
                <TableCell>
                  <StatusBadge status={attendanceStatusLabel(record.status)} />
                </TableCell>
                <TableCell className="tabular-nums text-copy-secondary">
                  {record.check_in_at ? formatTime(record.check_in_at) : EMPTY}
                </TableCell>
                <TableCell className="tabular-nums text-copy-secondary">
                  {record.check_out_at ? formatTime(record.check_out_at) : EMPTY}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {record.corrected_by?.name ?? EMPTY}
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(record)}
                      className="h-8.5 gap-1 px-2.5 text-[13px]"
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Correct
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-col divide-y divide-surface-border md:hidden">
        {records.map((record) => (
          <li key={record.id} className={cn("flex flex-col gap-3 p-4", isFetching && "opacity-70")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-copy-primary">
                  {record.teacher?.name ?? "Unknown teacher"}
                </p>
                <p className="text-sm tabular-nums text-copy-muted">{formatDate(record.date)}</p>
              </div>
              <StatusBadge status={attendanceStatusLabel(record.status)} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <RecordFact label="Check-in" value={record.check_in_at ? formatTime(record.check_in_at) : EMPTY} />
              <RecordFact label="Check-out" value={record.check_out_at ? formatTime(record.check_out_at) : EMPTY} />
              <RecordFact label="Corrected by" value={record.corrected_by?.name ?? EMPTY} />
            </dl>
            {canManage ? (
              <Button type="button" variant="outline" onClick={() => onEdit(record)} className="w-full">
                <Pencil className="size-4" aria-hidden />
                Correct record
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="border-t border-surface-border px-6 py-3.5">
        <ListPager
          meta={meta}
          page={page}
          lastPage={lastPage}
          unit="record"
          disabled={isFetching}
          onPage={onPage}
        />
      </div>
    </div>
  )
}

function RecordFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-copy-muted">{label}</dt>
      <dd className="truncate text-copy-primary">{value}</dd>
    </div>
  )
}

function TeacherAttendanceCorrectionDialog({
  record,
  open,
  onOpenChange,
}: {
  record: TeacherAttendanceRecord
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useCorrectTeacherAttendance()
  const [banner, setBanner] = React.useState<string | null>(null)
  const [confirming, setConfirming] = React.useState(false)

  const form = useForm<CorrectionValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: correctionValuesFromRecord(record),
  })

  async function submitCorrection(values: CorrectionValues) {
    setBanner(null)
    try {
      await mutation.mutateAsync({
        id: record.id,
        status: values.status,
        check_in_at: fromDatetimeLocal(values.check_in_at),
        check_out_at: fromDatetimeLocal(values.check_out_at),
      })
      toastSuccess("Teacher attendance corrected.", { id: "teacher-attendance-correct" })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, [
          "status",
          "check_in_at",
          "check_out_at",
        ])
        if (!mapped) setBanner(error.message)
      } else {
        setBanner(getErrorMessage(error, "Couldn't correct teacher attendance."))
      }
      toastError(error, "Couldn't correct teacher attendance.", {
        id: "teacher-attendance-correct",
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next)
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader icon={<CalendarCheck />}>
          <DialogTitle>Correct teacher attendance</DialogTitle>
          <DialogDescription>
            Update the record for {record.teacher?.name ?? "this teacher"} on {formatDate(record.date)}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-5"
            onSubmit={form.handleSubmit(() => {
              setBanner(null)
              setConfirming(true)
            })}
          >
            <FormBanner message={banner} />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue>
                            {(v: string) =>
                              attendanceStatusLabel(v as AttendanceStatusValue)
                            }
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ATTENDANCE_STATUSES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {attendanceStatusLabel(item)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="check_in_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check-in</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="check_out_at"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Check-out</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="h-11" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={mutation.isPending}>
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" disabled={mutation.isPending}>
                <Check className="size-4" aria-hidden />
                Review correction
              </Button>
            </DialogFooter>
          </form>
        </Form>

        <Dialog open={confirming} onOpenChange={(next) => !mutation.isPending && setConfirming(next)}>
          <DialogContent className="rounded-2xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply this correction?</DialogTitle>
              <DialogDescription>
                The API will save this attendance correction and record who corrected it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => setConfirming(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                loading={mutation.isPending}
                onClick={() => void submitCorrection(form.getValues())}
              >
                Apply correction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

function correctionValuesFromRecord(
  record: TeacherAttendanceRecord
): CorrectionValues {
  return {
    status: record.status,
    check_in_at: toDatetimeLocal(record.check_in_at),
    check_out_at: toDatetimeLocal(record.check_out_at),
  }
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}
