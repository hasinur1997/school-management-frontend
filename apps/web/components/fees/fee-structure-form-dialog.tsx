"use client"

/**
 * Create/edit dialog for a fee structure (task F-5.1, backend 10.1). One
 * component, both modes — a `fee` prop switches to edit. RHF + Zod, `422` →
 * field errors + form-level banner, success toast + close, no double submit
 * (`code-standards.md`, Forms).
 *
 * Every field is editable in both modes — name/description/fee_type/session/
 * class/amount. `branch_id` is never sent — the API stamps it from the class's
 * branch (re-derived server-side when the class changes).
 *
 * Money is a decimal **string** the whole way through — validated to ≤ 2 dp and
 * ≥ 0, never parsed into a float (`code-standards.md`, UI Conventions). Amount
 * edits affect only *future* invoice generation; the dialog says so.
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckIcon, Receipt } from "lucide-react"

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@/components/button"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { DEFAULT_CURRENCY } from "@/lib/format"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { SessionSelect } from "@/components/academic/session-select"
import { ClassSelect } from "@/components/academic/class-select"
import {
  useCreateFeeStructure,
  useUpdateFeeStructure,
} from "@/hooks/fees"
import {
  FEE_TYPE_LABELS,
  FEE_TYPES,
  type FeeStructure,
  type FeeStructureInput,
  type FeeStructureUpdateInput,
  type FeeType,
} from "@/types/fee"

// Money: a non-negative decimal string with at most 2 fractional digits. Kept as
// a string throughout — never parsed into a float (`code-standards.md`).
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(150, "Keep it under 150 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Keep it under 500 characters")
    .optional(),
  fee_type: z.string().min(1, "Fee type is required"),
  session_id: z.string().min(1, "Session is required"),
  class_id: z.string().min(1, "Class is required"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(AMOUNT_RE, "Enter a valid amount (up to 2 decimals)"),
})

type FeeFormValues = z.infer<typeof schema>

// 422 field names that map to an input.
const FIELD_NAMES = [
  "name",
  "description",
  "fee_type",
  "session_id",
  "class_id",
  "amount",
] as const

function toDefaults(fee: FeeStructure | undefined): FeeFormValues {
  return {
    name: fee?.name ?? "",
    description: fee?.description ?? "",
    fee_type: fee?.fee_type ?? "",
    session_id: fee?.session_id ?? fee?.session?.id ?? "",
    class_id: fee?.class_id ?? fee?.class?.id ?? "",
    amount: fee?.amount ?? "",
  }
}

export interface FeeStructureFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that fee; absent → create a new one. */
  fee?: FeeStructure
}

export function FeeStructureFormDialog({
  open,
  onOpenChange,
  fee,
}: FeeStructureFormDialogProps) {
  const isEdit = fee != null
  const createMutation = useCreateFeeStructure()
  const updateMutation = useUpdateFeeStructure()

  const form = useForm<FeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(undefined),
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset(toDefaults(fee))
  }, [open, fee, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      if (isEdit) {
        const payload: FeeStructureUpdateInput = {
          name: values.name,
          description: values.description?.trim() || null,
          fee_type: values.fee_type as FeeType,
          session_id: values.session_id,
          class_id: values.class_id,
          amount: values.amount.trim(),
        }
        await updateMutation.mutateAsync({ id: fee.id, ...payload })
        toastSuccess("Fee updated.", { id: "fee-form" })
      } else {
        const payload: FeeStructureInput = {
          name: values.name,
          description: values.description?.trim() || null,
          fee_type: values.fee_type as FeeType,
          session_id: values.session_id,
          class_id: values.class_id,
          amount: values.amount.trim(),
        }
        await createMutation.mutateAsync(payload)
        toastSuccess("Fee created.", { id: "fee-form" })
      }
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        // The duplicate-tuple `422` ("A fee with this name already exists for
        // this class and session") may arrive as a form-level message rather
        // than keyed to `name` — route it to the name field so it reads inline.
        if (/already exists/i.test(error.message)) {
          form.setError("name", { message: error.message }, { shouldFocus: true })
          return
        }
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the fee.", { id: "fee-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader icon={<Receipt />}>
          <DialogTitle>{isEdit ? "Edit fee" : "New fee"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this fee's details. Amount changes apply only to invoices generated from now on — already-generated invoices keep their amount."
              : "Define a named fee for a class in a session. A class can have several fees (e.g. a monthly tuition and a one-time admission fee)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="session_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Session</FormLabel>
                    <FormControl>
                      <SessionSelect
                        value={field.value || null}
                        onValueChange={(next) => field.onChange(next ?? "")}
                        disabled={submitting}
                        aria-label="Session"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Class</FormLabel>
                    <FormControl>
                      <ClassSelect
                        value={field.value || null}
                        onValueChange={(next) => field.onChange(next ?? "")}
                        disabled={submitting}
                        aria-label="Class"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={submitting}
                        placeholder="e.g. Tuition Fee"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fee_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Fee type</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ""}
                        onValueChange={(next) => field.onChange(next ?? "")}
                        disabled={submitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type">
                            {(v: string) =>
                              FEE_TYPE_LABELS[v as FeeType] ?? "Select type"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {FEE_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {FEE_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Monthly fees recur; one-time fees are charged once.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      disabled={submitting}
                      placeholder="Optional note about this fee."
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
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Create fee"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
