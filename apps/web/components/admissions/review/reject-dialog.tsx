"use client"

/**
 * Reject an admission application (task 2.6). Requires a reason (sent to the
 * applicant), validated client-side and re-surfaced from the server `422`
 * (`reason` field). Owns `useRejectAdmission`; on success the cache invalidation
 * refetches the queue/detail so the row leaves the pending list. The UI only
 * triggers the server-side rejection.
 */

import * as React from "react"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { Button } from "@/components/button"
import { FormBanner } from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { useRejectAdmission } from "@/hooks/admissions"
import { admissionApplicantName, type Admission } from "@/types/admission"

export interface RejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admission: Admission | null
}

export function RejectDialog({ open, onOpenChange, admission }: RejectDialogProps) {
  const reject = useRejectAdmission()
  const [reason, setReason] = React.useState("")
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [banner, setBanner] = React.useState<string | null>(null)

  const pending = reject.isPending

  // Reset the form on close so the next open starts blank (no reset-in-effect —
  // the dialog always closes between applications).
  function close() {
    setReason("")
    setFieldError(null)
    setBanner(null)
    onOpenChange(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!admission) return

    const trimmed = reason.trim()
    if (!trimmed) {
      setFieldError("A reason is required to reject this application.")
      return
    }
    setFieldError(null)
    setBanner(null)

    try {
      await reject.mutateAsync({ id: admission.id, rejection_reason: trimmed })
      toastSuccess("Application rejected.", { id: "admission-reject" })
      close()
    } catch (error) {
      if (isValidationError(error)) {
        const message = error.first("rejection_reason")
        if (message) {
          setFieldError(message)
          return
        }
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't reject this application.", {
        id: "admission-reject",
      })
      setBanner("Couldn't reject this application. Please try again.")
    }
  }

  const name = admission ? admissionApplicantName(admission) : ""

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && close()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
            <DialogDescription>
              Reject <span className="font-medium">{name}</span>? The reason below
              is recorded and may be shared with the applicant.
            </DialogDescription>
          </DialogHeader>

          <FormBanner message={banner} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="admission-reject-reason">
              Reason <span className="text-error">*</span>
            </Label>
            <Textarea
              id="admission-reject-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (fieldError) setFieldError(null)
              }}
              rows={4}
              placeholder="Explain why this application is being rejected…"
              aria-invalid={fieldError ? true : undefined}
              disabled={pending}
            />
            {fieldError ? (
              <p className="text-sm text-error" role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button
              type="submit"
              variant="destructive"
              loading={pending}
            >
              {pending ? "Rejecting…" : "Reject application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
