"use client"

/**
 * Reusable destructive-confirm dialog for the academic managers (task 2.2).
 * Destructive deletes confirm first (`ui-context.md`, Feedback & States); the
 * confirm button uses the error token (`destructive` variant) and shows its
 * in-flight loading state so a delete can't double-fire.
 *
 * The dialog is presentational — the caller owns the mutation and passes an
 * async `onConfirm`; success/error toasts are surfaced by the caller so the copy
 * can name the specific entity.
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

export interface DeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description: React.ReactNode
  /** Runs the delete; the dialog manages the in-flight + close lifecycle. */
  onConfirm: () => Promise<void>
  confirmLabel?: string
}

export function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Delete",
}: DeleteDialogProps) {
  const [deleting, setDeleting] = React.useState(false)

  async function handleConfirm() {
    setDeleting(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // The caller surfaces the error toast; keep the dialog open to retry.
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline" disabled={deleting}>
                Cancel
              </Button>
            }
          />
          <Button
            type="button"
            variant="destructive"
            loading={deleting}
            onClick={handleConfirm}
          >
            {deleting ? "Deleting…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
