"use client"

/**
 * Create/edit dialog for a branch (task 2.3). Super-admin only (the caller is
 * gated). RHF + Zod, `422` → field errors + form-level banner, success toast +
 * close, no double submit (`code-standards.md`, Forms). The mutation hooks
 * invalidate `["branches"]` so the list and the 1.5 branch switcher refresh.
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
import { Textarea } from "@workspace/ui/components/textarea"
import { Button } from "@/components/button"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  useCreateBranch,
  useUpdateBranch,
  type BranchInput,
} from "@/hooks/branches/use-branch-mutations"
import type { Branch } from "@/types/branch"
import { FormBanner, applyFieldErrors } from "./form-helpers"

const schema = z.object({
  name: z.string().trim().min(1, "Enter a branch name"),
  code: z.string().optional(),
  address: z.string().optional(),
  contact: z.string().optional(),
})

type BranchFormValues = z.infer<typeof schema>

const FIELD_NAMES = ["name", "code", "address", "contact"] as const

export interface BranchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that branch; absent → create a new one. */
  branch?: Branch
}

export function BranchFormDialog({
  open,
  onOpenChange,
  branch,
}: BranchFormDialogProps) {
  const isEdit = branch != null
  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()

  const form = useForm<BranchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", address: "", contact: "" },
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: branch?.name ?? "",
      code: branch?.code ?? "",
      address: branch?.address ?? "",
      contact: branch?.contact ?? "",
    })
  }, [open, branch, form])

  // Clear the banner on close (kept out of the open effect to avoid a
  // synchronous setState during render).
  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const payload: BranchInput = {
      name: values.name.trim(),
      code: values.code?.trim() || null,
      address: values.address?.trim() || null,
      contact: values.contact?.trim() || null,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: branch.id, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      toastSuccess(isEdit ? "Branch updated." : "Branch created.", {
        id: "branch-form",
      })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the branch.", { id: "branch-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit branch" : "New branch"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this branch's details."
              : "Add a branch/campus."}
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Main campus"
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
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional"
                      rows={2}
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
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Phone or email (optional)"
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
