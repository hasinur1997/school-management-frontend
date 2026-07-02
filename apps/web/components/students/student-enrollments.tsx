"use client"

/**
 * Enrollment history for a student (task 2.7) — the class history from the
 * dedicated `GET /students/{id}/enrollments` endpoint (`useStudentEnrollments`),
 * newest first. Owns its own loading / empty / error / loaded states so the rest
 * of the profile renders even while this is loading or fails.
 *
 * When `editable`, each row carries an inline editor (no modal): a `Pencil`
 * action swaps the row for session/class/section/roll/status controls with
 * Cancel/Save, persisting via `PUT /students/{id}/enrollments/{enrollmentId}`
 * (`useUpdateEnrollment`). `422` maps onto the fields; success toasts and
 * refetches.
 */

import * as React from "react"
import { Pencil } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { AcademicSelect } from "@/components/academic/academic-select"
import { ClassSelect } from "@/components/academic/class-select"
import { SectionSelect } from "@/components/academic/section-select"
import { SessionSelect } from "@/components/academic/session-select"
import { FormBanner } from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { useStudentEnrollments, useUpdateEnrollment } from "@/hooks/students"
import type {
  EnrollmentStatusValue,
  StudentEnrollment,
} from "@/types/student"

const EMPTY = "—"

const STATUS_OPTIONS: { value: EnrollmentStatusValue; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "promoted", label: "Promoted" },
  { value: "failed", label: "Failed" },
  { value: "tc", label: "TC" },
]

export function StudentEnrollments({
  id,
  editable = false,
}: {
  id: string
  editable?: boolean
}) {
  const { data, isPending, isError, refetch } = useStudentEnrollments(id)
  const [editingId, setEditingId] = React.useState<string | null>(null)

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorPanel
        description="We couldn't load the enrollment history."
        onRetry={() => void refetch()}
      />
    )
  }

  const enrollments = data ?? []
  if (enrollments.length === 0) {
    return (
      <EmptyState
        title="No enrollments"
        description="This student has no recorded class history yet."
        className="border-0 bg-transparent py-6"
      />
    )
  }

  const colSpan = editable ? 6 : 5

  return (
    <>
      {/* Table ≥ sm */}
      <div className="hidden overflow-hidden rounded-lg border border-surface-border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Status</TableHead>
              {editable ? <TableHead className="w-px text-right">Edit</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((e) =>
              editingId === e.id ? (
                <TableRow key={e.id}>
                  <TableCell colSpan={colSpan} className="p-0">
                    <EnrollmentEditor
                      studentId={id}
                      enrollment={e}
                      onCancel={() => setEditingId(null)}
                      onDone={() => setEditingId(null)}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-copy-primary">
                    {e.session || EMPTY}
                  </TableCell>
                  <TableCell className="text-copy-secondary">{e.class || EMPTY}</TableCell>
                  <TableCell className="text-copy-secondary">{e.section || EMPTY}</TableCell>
                  <TableCell className="text-copy-secondary">
                    {e.roll_no != null && e.roll_no !== "" ? e.roll_no : EMPTY}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} label={titleCase(e.status)} />
                  </TableCell>
                  {editable ? (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(e.id)}
                        className="size-8 rounded-lg text-copy-muted hover:text-copy-primary"
                        aria-label="Edit enrollment"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* Card list < sm */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {enrollments.map((e) => (
          <li
            key={e.id}
            className="flex flex-col gap-1 rounded-lg border border-surface-border bg-base/40 p-3"
          >
            {editingId === e.id ? (
              <EnrollmentEditor
                studentId={id}
                enrollment={e}
                onCancel={() => setEditingId(null)}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-copy-primary">{e.session || EMPTY}</span>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={e.status} label={titleCase(e.status)} />
                    {editable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingId(e.id)}
                        className="size-8 rounded-lg text-copy-muted hover:text-copy-primary"
                        aria-label="Edit enrollment"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="text-sm text-copy-secondary">
                  {[e.class, e.section].filter(Boolean).join(" · ") || EMPTY}
                  {e.roll_no != null && e.roll_no !== "" ? ` · Roll ${e.roll_no}` : ""}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

/** The inline edit form for one enrollment row, shared by the table and cards. */
function EnrollmentEditor({
  studentId,
  enrollment,
  onCancel,
  onDone,
}: {
  studentId: string
  enrollment: StudentEnrollment
  onCancel: () => void
  onDone: () => void
}) {
  const update = useUpdateEnrollment()

  const [sessionId, setSessionId] = React.useState<string | null>(enrollment.session_id)
  const [classId, setClassId] = React.useState<string | null>(enrollment.class_id)
  const [sectionId, setSectionId] = React.useState<string | null>(enrollment.section_id)
  const [roll, setRoll] = React.useState(
    enrollment.roll_no != null && enrollment.roll_no !== "" ? String(enrollment.roll_no) : ""
  )
  const [status, setStatus] = React.useState<EnrollmentStatusValue>(
    normalizeStatus(enrollment.status)
  )
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [banner, setBanner] = React.useState<string | null>(null)

  const submitting = update.isPending

  function setError(field: string, message: string | undefined) {
    setErrors((prev) => {
      const next = { ...prev }
      if (message) next[field] = message
      else delete next[field]
      return next
    })
  }

  async function save() {
    const rollNum = Number(roll)
    const nextErrors: Record<string, string> = {}
    if (!sessionId) nextErrors.session_id = "Required"
    if (!classId) nextErrors.class_id = "Required"
    if (!roll || !Number.isInteger(rollNum) || rollNum < 1) {
      nextErrors.roll_no = "Enter a valid roll number"
    }
    setErrors(nextErrors)
    setBanner(null)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await update.mutateAsync({
        studentId,
        enrollmentId: enrollment.id,
        session_id: sessionId!,
        class_id: classId!,
        section_id: sectionId,
        roll_no: rollNum,
        status,
      })
      toastSuccess("Enrollment updated.", { id: "enrollment-edit" })
      onDone()
    } catch (error) {
      if (isValidationError(error)) {
        const mapped: Record<string, string> = {}
        for (const field of ["session_id", "class_id", "section_id", "roll_no", "status"]) {
          const message = error.first(field)
          if (message) mapped[field] = message
        }
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped)
          return
        }
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't update the enrollment.", { id: "enrollment-edit" })
    }
  }

  return (
    <div className="flex flex-col gap-4 bg-base/40 p-4">
      <FormBanner message={banner} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Session" error={errors.session_id}>
          <SessionSelect
            value={sessionId}
            onValueChange={(next) => {
              setSessionId(next)
              setError("session_id", undefined)
            }}
            aria-label="Session"
          />
        </Field>
        <Field label="Class" error={errors.class_id}>
          <ClassSelect
            value={classId}
            onValueChange={(next) => {
              setClassId(next)
              // Sections are class-scoped — clear a stale section on class change.
              setSectionId(null)
              setError("class_id", undefined)
            }}
            aria-label="Class"
          />
        </Field>
        <Field label="Section (optional)" error={errors.section_id}>
          <SectionSelect
            classId={classId}
            value={sectionId}
            onValueChange={(next) => {
              setSectionId(next)
              setError("section_id", undefined)
            }}
            aria-label="Section"
          />
        </Field>
        <Field label="Roll" error={errors.roll_no}>
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            value={roll}
            onChange={(event) => {
              setRoll(event.target.value)
              setError("roll_no", undefined)
            }}
            disabled={submitting}
            aria-label="Roll number"
            aria-invalid={errors.roll_no ? true : undefined}
            className="h-8"
          />
        </Field>
        <Field label="Status" error={errors.status}>
          <AcademicSelect<EnrollmentStatusValue>
            value={status}
            onValueChange={(next) => next && setStatus(next)}
            options={STATUS_OPTIONS}
            aria-label="Status"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={submitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="button" size="sm" loading={submitting} onClick={() => void save()}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}

/** A labelled control + inline error, matching the form field rhythm. */
function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-copy-secondary">{label}</label>
      {children}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  )
}

/** Coerce a raw status string to a known enrollment status (default active). */
function normalizeStatus(status: string): EnrollmentStatusValue {
  switch (status) {
    case "promoted":
    case "failed":
    case "tc":
      return status
    default:
      return "active"
  }
}

function titleCase(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export type { StudentEnrollment }
