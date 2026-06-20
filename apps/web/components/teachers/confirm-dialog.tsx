"use client"

/**
 * Generic confirm dialog for the non-destructive teacher actions (task 2.4):
 * status toggle and resend-credentials (`ui-context.md`, Feedback & States — all
 * mutating actions confirm/feedback). Presentational: the caller owns the
 * mutation and passes an async `onConfirm`; the dialog manages the in-flight +
 * close lifecycle and the caller surfaces the success/error toast. The
 * destructive delete path uses the academic `DeleteDialog` instead.
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
import { Button } from "@/components/button"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description: React.ReactNode
  confirmLabel?: string
  pendingLabel?: string
  /** Runs the action; the dialog handles in-flight + close. */
  onConfirm: () => Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  pendingLabel = "Working…",
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // The caller surfaces the error toast; keep the dialog open to retry.
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            }
          />
          <Button type="button" loading={pending} onClick={handleConfirm}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
