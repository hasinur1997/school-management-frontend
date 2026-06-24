"use client"

/**
 * Inline-editable profile cards for the teacher detail page — the Profile
 * (identity + contact) and Assignments cards. Mirrors the student detail screen
 * (`student-profile-cards.tsx`): each `DetailCard` flips between a read-only row
 * view and an inline edit form (no modal), a `Pencil` action in the header opens
 * edit mode, and Cancel/Save sit in the card footer.
 *
 * Every save sends the full `PUT /teachers/{id}` payload (the card's edits merged
 * over the teacher's current mutable fields), so editing one card never drops the
 * other's values. `422` → field errors + a form-level banner; success → toast +
 * back to the read view (`ui-context.md`, Forms / Feedback).
 *
 * Editing is gated on `teachers.manage` (the `editable` prop), the same rule the
 * hero manage actions use. `email` is immutable (set once at creation) and the
 * `joining_date` isn't in the update contract, so both render as static rows.
 */

import * as React from "react"
import { BookOpen, Pencil, User } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { DetailCard, DetailRow } from "@/components/detail/detail-ui"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import { useUpdateTeacher } from "@/hooks/teachers"
import {
  assignmentSummaryLabels,
  isTeacherActive,
  teacherDisplayName,
  type Teacher,
  type TeacherAssignmentInput,
  type TeacherUpdateInput,
} from "@/types/teacher"
import { TeacherAssignmentsField } from "./teacher-assignments-field"

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
]

/**
 * The teacher's current mutable fields as the base `PUT` payload. Each card
 * spreads this and overrides only its own portion, so a partial edit still sends
 * a complete, valid body (the API treats `PUT` as a full replace). Mirrors the
 * defaults the edit dialog builds; `email`/`branch_id` are create-only.
 */
function teacherToPayload(teacher: Teacher): TeacherUpdateInput {
  return {
    name: teacherDisplayName(teacher).replace(/ #\d+$/, ""),
    phone: teacher.phone || null,
    designation: teacher.designation || null,
    employee_id: teacher.employee_id || null,
    gender: teacher.gender || null,
    address: teacher.address || null,
    is_active: isTeacherActive(teacher),
    // Resolve ids defensively: the API may expand relations as nested objects.
    assignments: (teacher.assignments ?? []).map((a) => ({
      class_id: a.class_id ?? a.class?.id ?? a.school_class?.id ?? null,
      section_id: a.section_id ?? a.section?.id ?? null,
      subject_id: a.subject_id ?? a.subject?.id ?? null,
    })),
  }
}

/** The header `Pencil` button that opens an inline-edit card (read-mode only). */
function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="size-8 rounded-lg text-copy-muted hover:text-copy-primary"
      aria-label={`Edit ${label}`}
    >
      <Pencil className="size-4" aria-hidden />
    </Button>
  )
}

/* -------------------------------------------------------------------------- */
/* Profile card                                                               */
/* -------------------------------------------------------------------------- */

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  employee_id: z.string().trim().optional(),
  gender: z.string().optional(),
  address: z.string().trim().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

const PROFILE_FIELD_NAMES = [
  "name",
  "phone",
  "designation",
  "employee_id",
  "gender",
  "address",
] as const

function profileDefaults(teacher: Teacher): ProfileValues {
  return {
    name: teacherDisplayName(teacher).replace(/ #\d+$/, ""),
    phone: teacher.phone ?? "",
    designation: teacher.designation ?? "",
    employee_id: teacher.employee_id ?? "",
    gender: teacher.gender ?? "",
    address: teacher.address ?? "",
  }
}

/** Identity + contact card — inline-editable name/phone/designation/etc. */
export function TeacherProfileCard({
  teacher,
  editable,
}: {
  teacher: Teacher
  editable: boolean
}) {
  const update = useUpdateTeacher()
  const [editing, setEditing] = React.useState(false)
  const [banner, setBanner] = React.useState<string | null>(null)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults(teacher),
  })

  function startEdit() {
    form.reset(profileDefaults(teacher))
    setBanner(null)
    setEditing(true)
  }

  function cancel() {
    if (form.formState.isSubmitting) return
    setBanner(null)
    setEditing(false)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await update.mutateAsync({
        id: teacher.id,
        ...teacherToPayload(teacher),
        name: values.name,
        phone: values.phone || null,
        designation: values.designation || null,
        employee_id: values.employee_id || null,
        gender: values.gender || null,
        address: values.address || null,
      })
      toastSuccess("Profile updated.", { id: "teacher-profile" })
      setEditing(false)
    } catch (error) {
      if (isValidationError(error)) {
        if (applyFieldErrors(form, error, PROFILE_FIELD_NAMES)) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save changes.", { id: "teacher-profile" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <DetailCard
      icon={User}
      title="Profile"
      action={
        editable && !editing ? (
          <EditButton label="profile" onClick={startEdit} />
        ) : null
      }
    >
      {editing ? (
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormBanner message={banner} />
            <div className="flex flex-col gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={submitting} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Email is immutable (set once at creation) — shown, never edited. */}
              <DetailRow label="Email" value={teacher.email} />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={submitting}
                        autoComplete="off"
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={submitting}
                        autoComplete="off"
                        className="font-mono"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={submitting} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ""}
                        onValueChange={(next) => field.onChange(next ?? "")}
                        disabled={submitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select gender">
                            {(v: string) =>
                              GENDERS.find((g) => g.value === v)?.label ??
                              "Select gender"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {GENDERS.map((g) => (
                            <SelectItem key={g.value} value={g.value}>
                              {g.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={submitting} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Joining date isn't part of the update contract — static. */}
              <DetailRow
                label="Joined"
                value={teacher.joining_date ? formatDate(teacher.joining_date) : null}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={cancel}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div>
          <DetailRow label="Email" value={teacher.email} />
          <DetailRow label="Phone" value={teacher.phone} mono />
          <DetailRow label="Employee ID" value={teacher.employee_id} mono />
          <DetailRow label="Designation" value={teacher.designation} />
          <DetailRow
            label="Gender"
            value={teacher.gender}
            valueClassName="capitalize"
          />
          <DetailRow label="Address" value={teacher.address} />
          <DetailRow
            label="Joined"
            value={teacher.joining_date ? formatDate(teacher.joining_date) : null}
          />
        </div>
      )}
    </DetailCard>
  )
}

/* -------------------------------------------------------------------------- */
/* Assignments card                                                           */
/* -------------------------------------------------------------------------- */

/** Class/subject assignments card — inline-editable repeatable assignment rows. */
export function TeacherAssignmentsCard({
  teacher,
  editable,
}: {
  teacher: Teacher
  editable: boolean
}) {
  const update = useUpdateTeacher()
  const [editing, setEditing] = React.useState(false)
  const [banner, setBanner] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<TeacherAssignmentInput[]>([])

  const assignments = teacher.assignments ?? []

  function startEdit() {
    setRows(teacherToPayload(teacher).assignments)
    setBanner(null)
    setEditing(true)
  }

  function cancel() {
    if (update.isPending) return
    setBanner(null)
    setEditing(false)
  }

  async function save() {
    setBanner(null)
    // Drop unfilled rows, then guard against half-filled ones (the API requires
    // a class per assignment) — mirrors the edit dialog's superRefine.
    const filled = rows.filter((r) => Boolean(r.class_id))
    if (filled.length !== rows.length) {
      setBanner("Select a class for each assignment, or remove the empty row.")
      return
    }
    try {
      await update.mutateAsync({
        id: teacher.id,
        ...teacherToPayload(teacher),
        assignments: filled.map((r) => ({
          class_id: r.class_id,
          section_id: r.section_id ?? null,
          subject_id: r.subject_id ?? null,
        })),
      })
      toastSuccess("Assignments updated.", { id: "teacher-assignments" })
      setEditing(false)
    } catch (error) {
      if (isValidationError(error)) {
        setBanner(error.message || "Check the class assignments below.")
        return
      }
      toastError(error, "Couldn't save changes.", { id: "teacher-assignments" })
    }
  }

  const submitting = update.isPending

  return (
    <DetailCard
      icon={BookOpen}
      title="Assignments"
      headerClassName={editing ? undefined : "mb-3"}
      action={
        editable && !editing ? (
          <EditButton label="assignments" onClick={startEdit} />
        ) : null
      }
    >
      {editing ? (
        <div className="flex flex-col gap-4">
          <FormBanner message={banner} />
          <TeacherAssignmentsField
            value={rows}
            onChange={setRows}
            disabled={submitting}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={cancel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={submitting}
              onClick={() => void save()}
            >
              {submitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No assignments"
          description="This teacher isn't assigned to any class yet."
          className="border-0 bg-transparent py-6"
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {assignments.map((a, i) => {
            const labels = assignmentSummaryLabels(a)
            return (
              <li
                key={a.id ?? i}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-surface-border bg-base px-4 py-3 text-sm"
              >
                <span className="font-semibold text-copy-primary">
                  {labels.class}
                </span>
                {labels.section ? (
                  <span className="text-copy-muted">· {labels.section}</span>
                ) : null}
                {labels.subject ? (
                  <StatusBadge
                    status="Subject"
                    tone="info"
                    label={labels.subject}
                    className="ml-auto"
                  />
                ) : (
                  <StatusBadge
                    status="Class teacher"
                    tone="neutral"
                    className="ml-auto"
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DetailCard>
  )
}
