"use client"

/**
 * Create/edit dialog for an academic session (task 2.2). One component serves
 * both modes: passing a `session` switches it to edit. RHF + Zod, `422` field
 * errors map back onto inputs, non-field messages show in a form-level banner,
 * success toasts + closes, and submit can't double-fire (`code-standards.md`,
 * Forms). Cache invalidation of the shared `["sessions"]` key lives in the hooks.
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
import { CalendarIcon } from "lucide-react"
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
  useCreateSession,
  useUpdateSession,
  type SessionInput,
} from "@/hooks/academic"
import type { AcademicSession } from "@/types/academic"
import { FormBanner, applyFieldErrors } from "./form-helpers"

const schema = z
  .object({
    name: z.string().trim().min(1, "Enter a session name"),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    is_current: z.boolean(),
  })
  .refine(
    (v) => !v.start_date || !v.end_date || v.end_date >= v.start_date,
    { path: ["end_date"], message: "End date must be after the start date" }
  )

type SessionFormValues = z.infer<typeof schema>

const FIELD_NAMES = ["name", "start_date", "end_date", "is_current"] as const

export interface SessionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that session; absent → create a new one. */
  session?: AcademicSession
}

export function SessionFormDialog({
  open,
  onOpenChange,
  session,
}: SessionFormDialogProps) {
  const isEdit = session != null
  const createMutation = useCreateSession()
  const updateMutation = useUpdateSession()

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      start_date: "",
      end_date: "",
      is_current: false,
    },
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  // Seed the form from the session each time the dialog opens.
  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: session?.name ?? "",
      start_date: session?.start_date ?? "",
      end_date: session?.end_date ?? "",
      is_current: session?.is_current ?? false,
    })
  }, [open, session, form])

  // Clear the form-level banner on close so it never lingers on reopen (kept out
  // of the open effect to avoid a synchronous setState during render).
  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const payload: SessionInput = {
      name: values.name.trim(),
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      is_current: values.is_current,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: session.id, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      toastSuccess(isEdit ? "Session updated." : "Session created.", {
        id: "session-form",
      })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the session.", { id: "session-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader icon={<CalendarIcon />}>
          <DialogTitle>{isEdit ? "Edit session" : "New session"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this academic session's details."
              : "Add an academic session (e.g. a school year)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 2025–2026"
                      autoFocus
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input type="date" disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_current"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2.5 text-sm text-copy-primary">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="size-4 rounded border-surface-border accent-brand"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        disabled={submitting}
                        ref={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    Set as the current session
                  </label>
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
