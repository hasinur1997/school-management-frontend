"use client"

/**
 * Create/edit dialog for a teacher (task 2.4). One component, both modes — an
 * `teacher` prop switches to edit. RHF + Zod, `422` → field errors + form-level
 * banner, success toast + close, no double submit (`code-standards.md`, Forms).
 *
 * Personal info plus a repeatable class/subject assignment editor (shared 2.1
 * selectors) and an active/inactive control. On create the API generates and
 * dispatches login credentials itself — we never build or show passwords; the
 * success toast surfaces that credentials were emailed (`ui-context.md`, Rules).
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Form,
  FormControl,
  FormDescription,
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
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { useBranch } from "@/components/branch/branch-provider"
import { BranchSelect } from "@/components/branch/branch-select"
import { useCreateTeacher, useUpdateTeacher } from "@/hooks/teachers"
import {
  isTeacherActive,
  teacherDisplayName,
  type Teacher,
  type TeacherInput,
  type TeacherUpdateInput,
} from "@/types/teacher"
import { TeacherAssignmentsField } from "./teacher-assignments-field"

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
]

const assignmentSchema = z.object({
  // Ids are opaque `public_id` hashes; `null` marks an unfilled row.
  class_id: z.string().min(1).nullable(),
  section_id: z.string().min(1).nullable(),
  subject_id: z.string().min(1).nullable(),
})

const schema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    phone: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    employee_id: z.string().trim().optional(),
    gender: z.string().optional(),
    address: z.string().trim().optional(),
    is_active: z.boolean(),
    branch_id: z.string().min(1).nullable(),
    assignments: z.array(assignmentSchema),
  })
  .superRefine((values, ctx) => {
    if (values.assignments.some((row) => !row.class_id)) {
      ctx.addIssue({
        path: ["assignments"],
        code: z.ZodIssueCode.custom,
        message: "Select a class for each assignment, or remove the empty row.",
      })
    }
  })

type TeacherFormValues = z.infer<typeof schema>

// 422 field names that map to an input (assignments errors go to the banner).
const FIELD_NAMES = [
  "name",
  "email",
  "phone",
  "designation",
  "employee_id",
  "gender",
  "address",
  "is_active",
  "branch_id",
] as const

function toDefaults(
  teacher: Teacher | undefined,
  defaultBranchId: string | null
): TeacherFormValues {
  return {
    name: teacher ? teacherDisplayName(teacher).replace(/ #\d+$/, "") : "",
    email: teacher?.email ?? "",
    phone: teacher?.phone ?? "",
    designation: teacher?.designation ?? "",
    employee_id: teacher?.employee_id ?? "",
    gender: teacher?.gender ?? "",
    address: teacher?.address ?? "",
    is_active: teacher ? isTeacherActive(teacher) : true,
    branch_id: teacher?.branch_id ?? defaultBranchId,
    // Resolve ids defensively: the API may expand relations as nested objects
    // (`class`/`section`/`subject`) rather than flat `*_id` fields.
    assignments: (teacher?.assignments ?? []).map((a) => ({
      class_id: a.class_id ?? a.class?.id ?? a.school_class?.id ?? null,
      section_id: a.section_id ?? a.section?.id ?? null,
      subject_id: a.subject_id ?? a.subject?.id ?? null,
    })),
  }
}

export interface TeacherFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that teacher; absent → create a new one. */
  teacher?: Teacher
}

export function TeacherFormDialog({
  open,
  onOpenChange,
  teacher,
}: TeacherFormDialogProps) {
  const isEdit = teacher != null
  const { isSuperAdmin, activeBranchId } = useBranch()
  const createMutation = useCreateTeacher()
  const updateMutation = useUpdateTeacher()

  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(undefined, activeBranchId),
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset(toDefaults(teacher, activeBranchId))
  }, [open, teacher, activeBranchId, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)

    // Super admin must scope a new teacher to a branch (the API requires it in
    // the body; the active branch is only attached as a query param).
    if (!isEdit && isSuperAdmin && values.branch_id == null) {
      form.setError("branch_id", { message: "Select a branch" })
      return
    }

    // Fields common to create and update. Email and branch are create-only — the
    // API prohibits changing them on update.
    const base: TeacherUpdateInput = {
      name: values.name,
      phone: values.phone || null,
      designation: values.designation || null,
      employee_id: values.employee_id || null,
      gender: values.gender || null,
      address: values.address || null,
      is_active: values.is_active,
      assignments: values.assignments
        .filter((row) => Boolean(row.class_id))
        .map((row) => ({
          class_id: row.class_id,
          section_id: row.section_id ?? null,
          subject_id: row.subject_id ?? null,
        })),
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: teacher.id, ...base })
        toastSuccess("Teacher updated.", { id: "teacher-form" })
      } else {
        const payload: TeacherInput = {
          ...base,
          email: values.email,
          ...(isSuperAdmin && values.branch_id != null
            ? { branch_id: values.branch_id }
            : {}),
        }
        const created = await createMutation.mutateAsync(payload)
        const email = created?.email || payload.email
        toastSuccess(
          email
            ? `Teacher created. Login credentials were emailed to ${email}.`
            : "Teacher created. Login credentials were generated and emailed.",
          { id: "teacher-form" }
        )
      }
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        // Surface assignment-array errors (e.g. `assignments.0.class_id`) too.
        const assignmentError =
          error.first("assignments") ||
          Object.keys(error.errors).find((k) => k.startsWith("assignments"))
            ? "Check the class assignments below."
            : null
        if (assignmentError) {
          form.setError("assignments", { message: assignmentError })
        }
        if (mapped || assignmentError) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the teacher.", { id: "teacher-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit teacher" : "New teacher"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this teacher's profile and assignments."
              : "Create a teacher. Login credentials are generated and emailed automatically."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormBanner message={banner} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        disabled={submitting}
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      Credentials are sent to this address.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={submitting} />
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
                      <Input {...field} disabled={submitting} />
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
                      <Input {...field} disabled={submitting} />
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
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ? "active" : "inactive"}
                        onValueChange={(next) =>
                          field.onChange(next === "active")
                        }
                        disabled={submitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {(v: string) =>
                              v === "inactive" ? "Inactive" : "Active"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isSuperAdmin && !isEdit ? (
                <FormField
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <FormControl>
                        <BranchSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={submitting}
                          aria-label="Branch"
                        />
                      </FormControl>
                      <FormDescription>
                        The branch this teacher belongs to.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

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

            <FormField
              control={form.control}
              name="assignments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class &amp; subject assignments</FormLabel>
                  <FormControl>
                    <TeacherAssignmentsField
                      value={field.value}
                      onChange={field.onChange}
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Pick a class per row; leave the subject empty for a
                    class-teacher assignment.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Create teacher"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
