"use client"

/**
 * Create a custom role (`POST /roles`, backend 15.1). The design's "Create
 * custom role" affordance opens this dialog. RHF + Zod; a duplicate name comes
 * back as a `422` on `name` ("A role with that name already exists") mapped to
 * the field. On success the parent selects the new role so its permissions can
 * be set straight away in the matrix.
 *
 * The display name is slugged to a snake_case identifier server-side; a live
 * preview of that slug is shown so there are no surprises.
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ShieldPlus } from "lucide-react"

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
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { useCreateRole } from "@/hooks/access-control"
import { humanizeSlug, type Role } from "@/types/access-control"

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a role name")
    .max(50, "Keep it under 50 characters"),
})

type FormValues = z.infer<typeof schema>

const FIELD_NAMES = ["name"] as const

/** Mirror the backend slug so the preview matches what gets stored. */
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export function CreateRoleDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (role: Role) => void
}) {
  const create = useCreateRole()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  })

  // Reset the form each time the dialog opens (clears fields + any prior error).
  React.useEffect(() => {
    if (open) form.reset({ name: "" })
  }, [open, form])

  const banner = form.formState.errors.root?.message ?? null

  async function onSubmit(values: FormValues) {
    form.clearErrors("root")
    try {
      const role = await create.mutateAsync({ name: values.name })
      toastSuccess(`Role "${humanizeSlug(role.name)}" created`)
      onOpenChange(false)
      onCreated(role)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (!mapped) form.setError("root", { message: error.message })
        return
      }
      toastError(error, "We couldn't create the role. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="size-5 text-[#7c3aed]" aria-hidden />
            Create custom role
          </DialogTitle>
          <DialogDescription>
            Add a new role, then choose exactly what it can do. You can assign it
            to users afterwards.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormBanner message={banner} />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => {
                const slug = toSlug(field.value ?? "")
                return (
                  <FormItem>
                    <FormLabel>Role name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoFocus
                        placeholder="e.g. Front desk"
                        autoComplete="off"
                      />
                    </FormControl>
                    {slug ? (
                      <p className="text-xs text-copy-muted">
                        Identifier:{" "}
                        <span className="font-mono text-copy-secondary">
                          {slug}
                        </span>
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                Create role
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
