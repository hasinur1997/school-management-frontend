"use client"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@/components/button"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { useCreateParent } from "@/hooks/parents"
import type { ParentCreateInput, ParentRelation } from "@/types/parent"
import { StudentPicker } from "./student-picker"

const schema = z.object({
  name: z.string().trim().min(1, "Required").max(150, "Maximum 150 characters"),
  phone: z.string().trim().min(1, "Required").max(20, "Maximum 20 characters"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]).optional(),
  relation: z.enum(["father", "mother", "guardian"], "Select a relation"),
  student_ids: z.array(z.string()).min(1, "Select at least one student"),
})

type ParentFormValues = z.infer<typeof schema>

const FIELD_NAMES = ["name", "phone", "email", "relation", "student_ids"] as const

const DEFAULT_VALUES: ParentFormValues = {
  name: "",
  phone: "",
  email: "",
  relation: "father",
  student_ids: [],
}

export interface ParentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ParentFormDialog({ open, onOpenChange }: ParentFormDialogProps) {
  const createParent = useCreateParent()
  const [banner, setBanner] = React.useState<string | null>(null)

  const form = useForm<ParentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(DEFAULT_VALUES)
  }, [open, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const payload: ParentCreateInput = {
      name: values.name,
      phone: values.phone,
      email: values.email?.trim() ? values.email.trim() : null,
      relation: values.relation as ParentRelation,
      student_ids: values.student_ids,
    }

    try {
      await createParent.mutateAsync(payload)
      toastSuccess("Parent created. Credentials are being sent.", { id: "parent-form" })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        if (applyFieldErrors(form, error, FIELD_NAMES)) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't create the parent.", { id: "parent-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create parent</DialogTitle>
          <DialogDescription>
            Create a parent login and link it to one or more students.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField form={form} name="name" label="Name" disabled={submitting} />
              <TextField form={form} name="phone" label="Phone" disabled={submitting} />
              <TextField
                form={form}
                name="email"
                label="Email (optional)"
                disabled={submitting}
              />
              <FormField
                control={form.control}
                name="relation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relation</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select relation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="student_ids"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Linked students</FormLabel>
                  <FormControl>
                    <StudentPicker
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={submitting}
                      error={fieldState.error?.message}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "Creating…" : "Create parent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function TextField({
  form,
  name,
  label,
  disabled,
}: {
  form: ReturnType<typeof useForm<ParentFormValues>>
  name: Exclude<keyof ParentFormValues, "relation" | "student_ids">
  label: string
  disabled: boolean
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
