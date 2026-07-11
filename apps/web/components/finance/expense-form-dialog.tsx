"use client"

/**
 * Create/edit dialog for a manual expense (task F-5.4, backend 11.3). One
 * component, both modes — an `expense` prop switches to edit. RHF + Zod, `422` →
 * field errors + form-level banner, success toast + close, no double submit
 * (`code-standards.md`, Forms).
 *
 * Money is a decimal **string** the whole way through — validated to ≤ 2 dp and
 * ≥ 0, never parsed into a float (`code-standards.md`, UI Conventions). The
 * category is optional; when set it must be an expense-type category (enforced
 * server-side).
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckIcon, TrendingDown } from "lucide-react"

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
import { useCreateExpense, useUpdateExpense } from "@/hooks/finance"
import type { Expense, ExpenseInput } from "@/types/finance"
import { CategorySelect } from "./category-select"

// Money: a non-negative decimal string with at most 2 fractional digits. Kept as
// a string throughout — never parsed into a float (`code-standards.md`).
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  item_name: z
    .string()
    .trim()
    .min(1, "Item name is required")
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

type ExpenseFormValues = z.infer<typeof schema>

// 422 field names that map to an input.
const FIELD_NAMES = [
  "item_name",
  "amount",
  "date",
  "category_id",
  "description",
] as const

function toDefaults(expense: Expense | undefined): ExpenseFormValues {
  return {
    item_name: expense?.item_name ?? "",
    amount: expense?.amount ?? "",
    date: expense?.date ?? "",
    category_id: expense?.category_id ?? "",
    description: expense?.description ?? "",
  }
}

export interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that expense; absent → create a new one. */
  expense?: Expense
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: ExpenseFormDialogProps) {
  const isEdit = expense != null
  const createMutation = useCreateExpense()
  const updateMutation = useUpdateExpense()

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(undefined),
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset(toDefaults(expense))
  }, [open, expense, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const payload: ExpenseInput = {
      item_name: values.item_name,
      amount: values.amount.trim(),
      date: values.date,
      category_id: values.category_id || null,
      description: values.description?.trim() || null,
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: expense.id, ...payload })
        toastSuccess("Expense updated.", { id: "expense-form" })
      } else {
        await createMutation.mutateAsync(payload)
        toastSuccess("Expense created.", { id: "expense-form" })
      }
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the expense.", { id: "expense-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader icon={<TrendingDown />}>
          <DialogTitle>{isEdit ? "Edit expense" : "New expense"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this expense entry."
              : "Record a manual expense entry for this branch."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            <FormField
              control={form.control}
              name="item_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Item name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={submitting}
                      placeholder="e.g. Electricity bill"
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
                      type="expense"
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
                      placeholder="Optional note about this expense."
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
                    : "Create expense"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
