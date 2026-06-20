"use client"

/**
 * Create/edit dialog for a teacher assignment (task 2.3). One component serves
 * both modes; passing an `assignment` switches it to edit. RHF + Zod, `422` →
 * field errors + form-level banner, success toast + close, no double submit
 * (`code-standards.md`, Forms).
 *
 * Teacher and class are required; section and subject are optional — an absent
 * subject marks a class-teacher assignment, a present one a subject-teacher
 * assignment. Section and subject are scoped to the chosen class (shared 2.1
 * selectors), so changing the class clears them. Cache invalidation lives in the
 * mutation hooks.
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
import { Button } from "@/components/button"
import {
  ClassSelect,
  SectionSelect,
  SessionSelect,
  SubjectSelect,
} from "@/components/academic"
import { TeacherSelect } from "@/components/teachers/teacher-select"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useCreateTeacherAssignment,
  useSessions,
  useUpdateTeacherAssignment,
  type TeacherAssignmentInput,
} from "@/hooks/academic"
import type { TeacherAssignment } from "@/types/academic"
import { FormBanner, applyFieldErrors } from "./form-helpers"

const schema = z
  .object({
    teacher_id: z.number().int().positive().nullable(),
    class_id: z.number().int().positive().nullable(),
    session_id: z.number().int().positive().nullable(),
    section_id: z.number().int().positive().nullable(),
    subject_id: z.number().int().positive().nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.teacher_id == null) {
      ctx.addIssue({
        path: ["teacher_id"],
        code: z.ZodIssueCode.custom,
        message: "Select a teacher",
      })
    }
    if (values.class_id == null) {
      ctx.addIssue({
        path: ["class_id"],
        code: z.ZodIssueCode.custom,
        message: "Select a class",
      })
    }
    if (values.session_id == null) {
      ctx.addIssue({
        path: ["session_id"],
        code: z.ZodIssueCode.custom,
        message: "Select a session",
      })
    }
  })

type AssignmentFormValues = z.infer<typeof schema>

const FIELD_NAMES = [
  "teacher_id",
  "class_id",
  "session_id",
  "section_id",
  "subject_id",
] as const

export interface AssignmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that assignment; absent → create a new one. */
  assignment?: TeacherAssignment
}

export function AssignmentFormDialog({
  open,
  onOpenChange,
  assignment,
}: AssignmentFormDialogProps) {
  const isEdit = assignment != null
  const createMutation = useCreateTeacherAssignment()
  const updateMutation = useUpdateTeacherAssignment()
  const { data: sessions } = useSessions()

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      teacher_id: null,
      class_id: null,
      session_id: null,
      section_id: null,
      subject_id: null,
    },
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  // Seed the form from the assignment each time the dialog opens. On create,
  // default the session to the current academic session when one is known.
  React.useEffect(() => {
    if (!open) return
    const defaultSessionId =
      assignment?.session_id ??
      sessions?.find((session) => session.is_current)?.id ??
      null
    form.reset({
      teacher_id: assignment?.teacher_id ?? null,
      class_id: assignment?.class_id ?? null,
      session_id: defaultSessionId,
      section_id: assignment?.section_id ?? null,
      subject_id: assignment?.subject_id ?? null,
    })
  }, [open, assignment, sessions, form])

  // Clear the banner on close (kept out of the open effect to avoid a
  // synchronous setState during render).
  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    // teacher_id/class_id/session_id are guaranteed non-null by the refinement.
    const payload: TeacherAssignmentInput = {
      teacher_id: values.teacher_id!,
      class_id: values.class_id!,
      session_id: values.session_id!,
      section_id: values.section_id ?? null,
      subject_id: values.subject_id ?? null,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: assignment.id, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      toastSuccess(isEdit ? "Assignment updated." : "Assignment created.", {
        id: "assignment-form",
      })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the assignment.", {
        id: "assignment-form",
      })
    }
  })

  const submitting = form.formState.isSubmitting
  const classId = form.watch("class_id")

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit assignment" : "New assignment"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this teacher assignment."
              : "Assign a teacher to a class. Add a subject for a subject-teacher."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormBanner message={banner} />

            <FormField
              control={form.control}
              name="teacher_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <FormControl>
                    <TeacherSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={submitting}
                      aria-label="Teacher"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="session_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session</FormLabel>
                  <FormControl>
                    <SessionSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={submitting}
                      aria-label="Session"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="class_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <FormControl>
                    <ClassSelect
                      value={field.value}
                      onValueChange={(next) => {
                        field.onChange(next)
                        // Section/subject are scoped to the class — reset them.
                        form.setValue("section_id", null)
                        form.setValue("subject_id", null)
                      }}
                      disabled={submitting}
                      aria-label="Class"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="section_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <FormControl>
                      <SectionSelect
                        classId={classId}
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={submitting}
                        aria-label="Section"
                      />
                    </FormControl>
                    <FormDescription>Optional.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <SubjectSelect
                        classId={classId}
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={submitting}
                        aria-label="Subject"
                      />
                    </FormControl>
                    <FormDescription>Subject-teacher only.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
