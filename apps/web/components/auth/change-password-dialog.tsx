"use client"

/**
 * Change-password dialog (RHF + Zod), surfaced from the user menu (built in
 * 1.5). Controlled via `open` / `onOpenChange`; pass a `trigger` to render the
 * opener inline. `422` field errors map back onto inputs; success toasts and
 * closes. Submit can't double-fire.
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useChangePassword } from "@/hooks/auth/use-change-password"

const schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "Use at least 8 characters"),
    password_confirmation: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.password === v.password_confirmation, {
    path: ["password_confirmation"],
    message: "Passwords don't match",
  })

type ChangePasswordValues = z.infer<typeof schema>

const FIELD_NAMES = [
  "current_password",
  "password",
  "password_confirmation",
] as const

export interface ChangePasswordDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Optional inline opener (e.g. a menu item). */
  trigger?: React.ReactNode
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  trigger,
}: ChangePasswordDialogProps) {
  const mutation = useChangePassword()
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      password: "",
      password_confirmation: "",
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values)
      toastSuccess("Password changed.", { id: "change-password" })
      form.reset()
      onOpenChange?.(false)
    } catch (error) {
      // Map 422 field errors onto inputs; surface anything else as a toast.
      if (isValidationError(error)) {
        let focused = false
        for (const field of FIELD_NAMES) {
          const message = error.first(field)
          if (!message) continue
          form.setError(field, { message }, { shouldFocus: !focused })
          focused = true
        }
        if (focused) return
      }
      toastError(error, "Couldn't change your password.", {
        id: "change-password",
      })
    }
  })

  // Reset the form whenever the dialog closes so it reopens clean.
  function handleOpenChange(next: boolean) {
    if (!next) form.reset()
    onOpenChange?.(next)
  }

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger render={trigger as React.ReactElement} /> : null}
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
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
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
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
              name="password_confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={submitting}>
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" loading={submitting}>
                {submitting ? "Saving…" : "Save password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
