"use client"

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Button } from "@/components/button"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { useLinkParentStudent } from "@/hooks/parents"
import type { ParentProfile } from "@/types/parent"
import { StudentPicker } from "./student-picker"

const schema = z.object({
  student_ids: z.array(z.string()).min(1, "Select at least one student"),
})

type LinkStudentsValues = z.infer<typeof schema>

const FIELD_NAMES = ["student_ids"] as const

export interface LinkStudentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parent: ParentProfile | null
}

export function LinkStudentsDialog({
  open,
  onOpenChange,
  parent,
}: LinkStudentsDialogProps) {
  const linkStudent = useLinkParentStudent()
  const [banner, setBanner] = React.useState<string | null>(null)
  const form = useForm<LinkStudentsValues>({
    resolver: zodResolver(schema),
    defaultValues: { student_ids: [] },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({ student_ids: [] })
  }, [open, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!parent) return
    setBanner(null)

    try {
      for (const studentId of values.student_ids) {
        await linkStudent.mutateAsync({ parentId: parent.id, studentId })
      }
      toastSuccess(
        values.student_ids.length === 1
          ? "Student linked to parent."
          : "Students linked to parent.",
        { id: "parent-link" }
      )
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        if (applyFieldErrors(form, error, FIELD_NAMES)) return
        const studentMessage = error.first("student_id")
        setBanner(studentMessage ?? error.message)
        return
      }
      toastError(error, "Couldn't link the student.", { id: "parent-link" })
    }
  })

  if (!parent) return null

  const submitting = form.formState.isSubmitting
  const linkedIds = parent.students?.map((student) => student.id) ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link students</DialogTitle>
          <DialogDescription>
            Add one or more students to {parent.name}&rsquo;s linked children.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            <FormField
              control={form.control}
              name="student_ids"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Students</FormLabel>
                  <FormControl>
                    <StudentPicker
                      value={field.value}
                      onValueChange={field.onChange}
                      excludeIds={linkedIds}
                      disabled={submitting}
                      error={fieldState.error?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Linking…" : "Link students"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
