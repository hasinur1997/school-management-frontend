"use client"

/**
 * Create/edit dialog for a class (task 2.2). Mirrors the session dialog: RHF +
 * Zod, `422` → field errors + banner, success toast + close, no double submit.
 * `numeric_level` is the grade level 1–12 (required, unique per branch — it
 * doubles as the promotion order); it's held as a string in the form and
 * coerced to a number on submit.
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
import { SchoolIcon } from "lucide-react"
import {
  Form,
  FormControl,
  FormDescription,
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
  useCreateClass,
  useUpdateClass,
  type ClassInput,
} from "@/hooks/academic"
import { useBranch } from "@/components/branch/branch-provider"
import { BranchSelect } from "@/components/branch/branch-select"
import type { SchoolClass } from "@/types/academic"
import { FormBanner, applyFieldErrors } from "./form-helpers"

const schema = z.object({
  name: z.string().trim().min(1, "Enter a class name"),
  numeric_level: z
    .string()
    .trim()
    .min(1, "Enter a grade level")
    .refine((v) => /^\d+$/.test(v), "Enter a whole number")
    .refine((v) => {
      const n = Number(v)
      return n >= 1 && n <= 12
    }, "Level must be between 1 and 12"),
  // Target branch for a super-admin create/edit; auto-scoped users keep it `null`.
  branch_id: z.string().min(1).nullable(),
})

type ClassFormValues = z.infer<typeof schema>

const FIELD_NAMES = ["name", "numeric_level", "branch_id"] as const

export interface ClassFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that class; absent → create a new one. */
  schoolClass?: SchoolClass
}

export function ClassFormDialog({
  open,
  onOpenChange,
  schoolClass,
}: ClassFormDialogProps) {
  const isEdit = schoolClass != null
  const { isSuperAdmin, activeBranchId } = useBranch()
  const createMutation = useCreateClass()
  const updateMutation = useUpdateClass()

  const form = useForm<ClassFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", numeric_level: "", branch_id: activeBranchId },
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset({
      name: schoolClass?.name ?? "",
      numeric_level:
        schoolClass?.numeric_level != null
          ? String(schoolClass.numeric_level)
          : "",
      branch_id: schoolClass?.branch_id ?? activeBranchId,
    })
  }, [open, schoolClass, activeBranchId, form])

  // Clear the banner on close (kept out of the open effect to avoid a
  // synchronous setState during render).
  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)

    // Super admin must scope the class to a branch on both create and edit
    // (the API requires it in the body when no branch is active). Auto-scoped
    // users never send it.
    if (isSuperAdmin && values.branch_id == null) {
      form.setError("branch_id", { message: "Select a branch" })
      return
    }

    const payload: ClassInput = {
      name: values.name.trim(),
      numeric_level: Number(values.numeric_level),
      ...(isSuperAdmin && values.branch_id != null
        ? { branch_id: values.branch_id }
        : {}),
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: schoolClass.id, ...payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      toastSuccess(isEdit ? "Class updated." : "Class created.", {
        id: "class-form",
      })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the class.", { id: "class-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader icon={<SchoolIcon />}>
          <DialogTitle>{isEdit ? "Edit class" : "New class"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this class's details."
              : "Add a class/grade. Sections and subjects are managed from the class."}
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
                      placeholder="e.g. Grade 6"
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
              name="numeric_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Level</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={12}
                      placeholder="e.g. 6"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Grade level 1–12 · doubles as the promotion order, unique per
                    branch.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSuperAdmin ? (
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Branch</FormLabel>
                    <FormControl>
                      <BranchSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={submitting}
                        aria-label="Branch"
                      />
                    </FormControl>
                    <FormDescription>
                      The branch this class belongs to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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
