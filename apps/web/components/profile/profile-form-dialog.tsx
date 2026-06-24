"use client"

/**
 * Edit-profile dialog (RHF + Zod) for the signed-in user. Pre-fills from the
 * current `AuthUser`, submits `PUT /auth/profile`, maps `422` back onto the
 * fields (non-field messages in the banner), and on success toasts + closes.
 * Submit can't double-fire. Only self-editable fields are exposed — role,
 * branch, and permissions stay API-owned.
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
} from "@workspace/ui/components/dialog"
import { UserIcon } from "lucide-react"
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
import {
  applyFieldErrors,
  FormBanner,
} from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { useUpdateProfile } from "@/hooks/auth/use-profile-mutations"
import type { AuthUser, ProfileUpdateInput } from "@/types/auth"

const schema = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional(),
  phone: z.string().trim().max(30, "Phone is too long").optional(),
})

type ProfileFormValues = z.infer<typeof schema>

const FIELD_NAMES = ["name", "email", "phone"] as const

export interface ProfileFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AuthUser
}

export function ProfileFormDialog({
  open,
  onOpenChange,
  user,
}: ProfileFormDialogProps) {
  const mutation = useUpdateProfile()
  const [banner, setBanner] = React.useState<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name,
      email: user.email ?? "",
      phone: user.phone ?? "",
    },
  })

  // Re-seed the form whenever it (re)opens so it reflects the latest user.
  // `form.reset` isn't React state, so this doesn't cascade renders; the banner
  // is cleared on close (`handleOpenChange`) and at the start of each submit.
  React.useEffect(() => {
    if (open) {
      form.reset({
        name: user.name,
        email: user.email ?? "",
        phone: user.phone ?? "",
      })
    }
  }, [open, user, form])

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const input: ProfileUpdateInput = {
      name: values.name,
      email: values.email ? values.email : null,
      phone: values.phone ? values.phone : null,
    }
    try {
      await mutation.mutateAsync(input)
      toastSuccess("Profile updated.", { id: "profile-update" })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (!mapped) setBanner(error.message)
        return
      }
      toastError(error, "Couldn't update your profile.", {
        id: "profile-update",
      })
    }
  })

  function handleOpenChange(next: boolean) {
    if (mutation.isPending) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader icon={<UserIcon />}>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Update your personal details.
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
                      autoComplete="name"
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      autoComplete="tel"
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
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
