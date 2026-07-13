"use client"

/**
 * Issue transfer certificate dialog (task 6.2). Issuing a TC is
 * **irreversible status-wise** — it retires the student (status → tc, enforced
 * by the API across attendance/invoicing/promotion) and stores the one legal
 * PDF — so the dialog leads with an explicit warning and an obvious confirm
 * (`ui-context.md`, Feedback & States; ticket: explicit confirmation required).
 *
 * RHF + Zod: `reason` (required, ≤255) and `issue_date` (required date,
 * defaulting to today). `422` → field errors + banner; a `409` ("already
 * issued") surfaces as the banner. On success the caller receives the created TC
 * so it can download the streamed PDF; the `useIssueTc` hook already invalidates
 * the student + TC caches so the profile reflects the new status.
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertTriangle, ScrollText } from "lucide-react"

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
import { Textarea } from "@workspace/ui/components/textarea"
import { Button } from "@/components/button"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { useIssueTc } from "@/hooks/documents"
import type { TransferCertificate } from "@/types/document"

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "A reason is required")
    .max(255, "Keep it under 255 characters"),
  issue_date: z.string().min(1, "An issue date is required"),
})

type IssueTcFormValues = z.infer<typeof schema>

// 422 field names that map to an input.
const FIELD_NAMES = ["reason", "issue_date"] as const

/** Today as `YYYY-MM-DD` for the default issue date. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export interface IssueTcDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  /** Called with the created certificate after a successful issue. */
  onIssued: (tc: TransferCertificate) => void
}

export function IssueTcDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  onIssued,
}: IssueTcDialogProps) {
  const issueTc = useIssueTc()
  const [banner, setBanner] = React.useState<string | null>(null)

  const form = useForm<IssueTcFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "", issue_date: today() },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({ reason: "", issue_date: today() })
    setBanner(null)
  }, [open, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      const tc = await issueTc.mutateAsync({
        studentId,
        input: { reason: values.reason, issue_date: values.issue_date },
      })
      toastSuccess("Transfer certificate issued.", { id: "issue-tc" })
      onOpenChange(false)
      onIssued(tc)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      // A 409 ("already issued") carries a helpful message — show it in-dialog.
      setBanner(
        error instanceof Error
          ? error.message
          : "Couldn't issue the transfer certificate."
      )
      toastError(error, "Couldn't issue the transfer certificate.", {
        id: "issue-tc",
      })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader icon={<ScrollText />}>
          <DialogTitle>Issue transfer certificate</DialogTitle>
          <DialogDescription>
            Issue a transfer certificate for{" "}
            <span className="font-medium text-copy-primary">{studentName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/10 px-3.5 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            This is irreversible. The student is retired to <strong>TC</strong>{" "}
            status and excluded from attendance, invoicing, and promotion.
          </span>
        </div>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      disabled={submitting}
                      placeholder="e.g. Relocating to another city"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issue_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Issue date</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      disabled={submitting}
                      max={today()}
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
              <Button type="submit" variant="destructive" loading={submitting}>
                {submitting ? "Issuing…" : "Issue certificate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
