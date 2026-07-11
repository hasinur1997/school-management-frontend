"use client"

/**
 * Create/edit dialog for a manual income (task F-5.4, backend 11.2). One
 * component, both modes — an `income` prop switches to edit. RHF + Zod, `422` →
 * field errors + form-level banner, success toast + close, no double submit
 * (`code-standards.md`, Forms).
 *
 * System-generated fee income is never edited here — the list hides the action
 * and never opens this dialog for such rows; the API's `403` stays the boundary.
 *
 * Money is a decimal **string** the whole way through — validated to ≤ 2 dp and
 * ≥ 0, never parsed into a float (`code-standards.md`, UI Conventions). The
 * category is optional; when set it must be an income-type category (enforced
 * server-side).
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckIcon, TrendingUp } from "lucide-react"

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
import { DEFAULT_CURRENCY } from "@/lib/format"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { useCreateIncome, useUpdateIncome } from "@/hooks/finance"
import type { Income, IncomeInput } from "@/types/finance"
import { CategorySelect } from "./category-select"

// Money: a non-negative decimal string with at most 2 fractional digits. Kept as
// a string throughout — never parsed into a float (`code-standards.md`).
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(150, "Keep it under 150 characters"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(AMOUNT_RE, "Enter a valid amount (up to 2 decimals)"),
  date: z.string().min(1, "Date is required"),
  category_id: z.string().optional(),
  description: z
    .string()
    .trim()
    .max(1000, "Keep it under 1000 characters")
    .optional(),
})

type IncomeFormValues = z.infer<typeof schema>

// 422 field names that map to an input.
const FIELD_NAMES = [
  "title",
  "amount",
  "date",
  "category_id",
  "description",
] as const

function toDefaults(income: Income | undefined): IncomeFormValues {
  return {
    title: income?.title ?? "",
    amount: income?.amount ?? "",
    date: income?.date ?? "",
    category_id: income?.category_id ?? "",
    description: income?.description ?? "",
  }
}

export interface IncomeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that income; absent → create a new one. */
  income?: Income
}

export function IncomeFormDialog({
  open,
  onOpenChange,
  income,
}: IncomeFormDialogProps) {
  const isEdit = income != null
  const createMutation = useCreateIncome()
  const updateMutation = useUpdateIncome()

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(undefined),
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset(toDefaults(income))
  }, [open, income, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const payload: IncomeInput = {
      title: values.title,
      amount: values.amount.trim(),
      date: values.date,
      category_id: values.category_id || null,
      description: values.description?.trim() || null,
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: income.id, ...payload })
        toastSuccess("Income updated.", { id: "income-form" })
      } else {
        await createMutation.mutateAsync(payload)
        toastSuccess("Income created.", { id: "income-form" })
      }
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the income.", { id: "income-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader icon={<TrendingUp />}>
          <DialogTitle>{isEdit ? "Edit income" : "New income"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this income entry."
              : "Record a manual income entry for this branch."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={submitting}
                      placeholder="e.g. Donation"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-copy-muted"
                          aria-hidden
                        >
                          {DEFAULT_CURRENCY}
                        </span>
                        <Input
                          {...field}
                          disabled={submitting}
                          inputMode="decimal"
                          placeholder="0.00"
                          autoComplete="off"
                          className="pl-8 text-right tabular-nums"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={submitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <CategorySelect
                      type="income"
                      value={field.value || null}
                      onValueChange={(next) => field.onChange(next ?? "")}
                      disabled={submitting}
                      clearLabel="No category"
                      aria-label="Category"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      disabled={submitting}
                      placeholder="Optional note about this income."
                      rows={3}
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
                {!submitting ? <CheckIcon /> : null}
                {submitting
                  ? "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Create income"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
