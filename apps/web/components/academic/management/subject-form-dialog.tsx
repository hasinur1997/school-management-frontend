"use client"

/**
 * Create/edit dialog for a subject within a class (task 2.2). Create posts to
 * `POST /classes/{class}/subjects` (needs `classId`); edit uses `PUT /subjects/{id}`.
 * RHF + Zod, `422` → field errors + banner, success toast + close, no double submit.
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useCreateSubject,
  useUpdateSubject,
  type SubjectInput,
} from "@/hooks/academic"
import type { Subject } from "@/types/academic"
import { FormBanner, applyFieldErrors } from "./form-helpers"

const schema = z.object({
  name: z.string().trim().min(1, "Enter a subject name"),
  code: z.string().optional(),
})

type SubjectFormValues = z.infer<typeof schema>

const FIELD_NAMES = ["name", "code"] as const

export interface SubjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Class the subject belongs to (required to create). */
  classId: string
  /** Present → edit that subject; absent → create within the class. */
  subject?: Subject
}

export function SubjectFormDialog({
  open,
  onOpenChange,
  classId,
  subject,
}: SubjectFormDialogProps) {
  const isEdit = subject != null
  const createMutation = useCreateSubject()
  const updateMutation = useUpdateSubject()

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "" },
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: subject?.name ?? "",
      code: subject?.code ?? "",
    })
  }, [open, subject, form])

  // Clear the banner on close (kept out of the open effect to avoid a
  // synchronous setState during render).
  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const payload: SubjectInput = {
      name: values.name.trim(),
      code: values.code?.trim() || null,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: subject.id, ...payload })
      } else {
        await createMutation.mutateAsync({ classId, ...payload })
      }
      toastSuccess(isEdit ? "Subject updated." : "Subject created.", {
        id: "subject-form",
      })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the subject.", { id: "subject-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit subject" : "New subject"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this subject's details."
              : "Add a subject to this class."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormBanner message={banner} />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Mathematics"
                      autoFocus
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
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
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
