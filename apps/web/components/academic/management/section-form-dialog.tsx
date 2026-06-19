"use client"

/**
 * Create/edit dialog for a section within a class (task 2.2). Create posts to
 * `POST /classes/{class}/sections` (needs `classId`); edit uses `PUT /sections/{id}`.
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
  useCreateSection,
  useUpdateSection,
  type SectionInput,
} from "@/hooks/academic"
import type { Section } from "@/types/academic"
import { FormBanner, applyFieldErrors } from "./form-helpers"

const schema = z.object({
  name: z.string().trim().min(1, "Enter a section name"),
  capacity: z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v.trim()), "Enter a whole number"),
})

type SectionFormValues = z.infer<typeof schema>

const FIELD_NAMES = ["name", "capacity"] as const

export interface SectionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Class the section belongs to (required to create). */
  classId: number
  /** Present → edit that section; absent → create within the class. */
  section?: Section
}

export function SectionFormDialog({
  open,
  onOpenChange,
  classId,
  section,
}: SectionFormDialogProps) {
  const isEdit = section != null
  const createMutation = useCreateSection()
  const updateMutation = useUpdateSection()

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", capacity: "" },
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: section?.name ?? "",
      capacity: section?.capacity != null ? String(section.capacity) : "",
    })
  }, [open, section, form])

  // Clear the banner on close (kept out of the open effect to avoid a
  // synchronous setState during render).
  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const payload: SectionInput = {
      name: values.name.trim(),
      capacity: values.capacity?.trim() ? Number(values.capacity) : null,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: section.id, ...payload })
      } else {
        await createMutation.mutateAsync({ classId, ...payload })
      }
      toastSuccess(isEdit ? "Section updated." : "Section created.", {
        id: "section-form",
      })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the section.", { id: "section-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit section" : "New section"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this section's details."
              : "Add a section to this class."}
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
                      placeholder="e.g. A"
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
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
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
