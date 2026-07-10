"use client"

/**
 * Create/edit dialog for a single invoice (task F-5.2, backend 10.2). One
 * component, both modes — an `invoice` prop switches to edit. RHF + Zod, `422` →
 * field errors + form-level banner, success toast + close, no double submit
 * (`code-standards.md`, Forms).
 *
 * Create sends the student, period, amount, and an optional due date; the API
 * derives the branch, the student's active enrollment, and the invoice number,
 * and rejects a duplicate (student, month, year) or a student with no active
 * enrollment with a `422`. Edit keeps the student fixed and sends only the
 * amount, due date, and period — `paid_amount`/`status` stay payment-derived.
 *
 * Money is a decimal **string** end to end — validated to ≤ 2 dp and ≥ 0, never
 * parsed into a float (`code-standards.md`, UI Conventions).
 */

import * as React from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Check,
  GraduationCap,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
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
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import { DEFAULT_CURRENCY, formatMoney, sumMoney } from "@/lib/format"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { useStudents } from "@/hooks/students"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useCreateInvoice, useInvoice, useUpdateInvoice } from "@/hooks/invoices"
import {
  studentDisplayName,
  studentInitials,
  type StudentListItem,
} from "@/types/student"
import {
  INVOICE_MONTHS,
  invoiceStudentName,
  type Invoice,
  type InvoiceInput,
  type InvoiceUpdateInput,
} from "@/types/invoice"

// Money: a non-negative decimal string with at most 2 fractional digits.
const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

const itemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(255, "Keep the description under 255 characters"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(AMOUNT_RE, "Enter a valid amount (up to 2 decimals)"),
})

const schema = z.object({
  student_id: z.string().min(1, "Student is required"),
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
  items: z.array(itemSchema).min(1, "Add at least one item"),
  due_date: z.string().optional(),
})

type InvoiceFormValues = z.infer<typeof schema>

// 422 field names that map to an input.
const FIELD_NAMES = ["student_id", "month", "year", "items", "due_date"] as const

/** An empty line-item row (used for the initial row and each "Add item"). */
const EMPTY_ITEM = { description: "", amount: "" }

/** Recent years offered in the period selector (current − 4 … current + 1). */
function selectableYears(): number[] {
  const now = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => now + 1 - i)
}

function toDefaults(invoice: Invoice | undefined): InvoiceFormValues {
  const now = new Date()
  // Prefer the invoice's stored line items; fall back to a single row from its
  // total for an older invoice loaded without items, and to one empty row on
  // create.
  const items =
    invoice?.items && invoice.items.length > 0
      ? invoice.items.map((item) => ({
          description: item.description,
          amount: item.amount,
        }))
      : invoice
        ? [{ description: "", amount: invoice.amount }]
        : [{ ...EMPTY_ITEM }]

  return {
    student_id: invoice?.student?.id ?? "",
    month: String(invoice?.month ?? now.getMonth() + 1),
    year: String(invoice?.year ?? now.getFullYear()),
    items,
    due_date: invoice?.due_date ?? "",
  }
}

export interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that invoice; absent → create a new one. */
  invoice?: Invoice
  /**
   * Preset student for create mode (e.g. opened from a student's Billing tab):
   * locks the student field to this student.
   */
  presetStudent?: { id: string; name: string }
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
  presetStudent,
}: InvoiceFormDialogProps) {
  const isEdit = invoice != null
  const createMutation = useCreateInvoice()
  const updateMutation = useUpdateInvoice()

  // The list-row invoice carries no line items (they're on the detail read), so
  // fetch the detail while editing to seed the item rows — otherwise saving
  // would collapse a multi-item invoice into a single line.
  const needsDetail = open && isEdit && invoice.items === undefined
  const { data: detail } = useInvoice(
    needsDetail ? invoice.id : undefined,
    needsDetail
  )
  // The freshest edit source: the fetched detail once it arrives, else the prop.
  const editTarget = isEdit ? (detail ?? invoice) : undefined

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(undefined),
  })
  const itemFields = useFieldArray({ control: form.control, name: "items" })
  const [banner, setBanner] = React.useState<string | null>(null)

  // Live invoice total — the sum of the item amounts, recomputed as they type.
  const total = sumMoney((form.watch("items") ?? []).map((item) => item.amount))

  // Reset the form whenever the dialog opens for a (possibly different) target,
  // and again once the edit detail (with its items) loads.
  // `form.reset` isn't React state, so this stays a plain sync effect.
  React.useEffect(() => {
    if (!open) return
    form.reset({
      ...toDefaults(editTarget),
      student_id: editTarget?.student?.id ?? presetStudent?.id ?? "",
    })
  }, [open, editTarget, presetStudent, form])

  // The student is fixed in edit mode, and locked when a preset is supplied. Its
  // label comes straight from the props (no state to sync).
  const studentLocked = isEdit || presetStudent != null
  const lockedLabel = isEdit
    ? invoiceStudentName(invoice)
    : (presetStudent?.name ?? "—")

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const items = values.items.map((item) => ({
      description: item.description.trim(),
      amount: item.amount.trim(),
    }))
    try {
      if (isEdit) {
        const payload: InvoiceUpdateInput = {
          items,
          due_date: values.due_date?.trim() || null,
          month: Number(values.month),
          year: Number(values.year),
        }
        await updateMutation.mutateAsync({ id: invoice.id, ...payload })
        toastSuccess("Invoice updated.", { id: "invoice-form" })
      } else {
        const payload: InvoiceInput = {
          student_id: values.student_id,
          month: Number(values.month),
          year: Number(values.year),
          items,
          due_date: values.due_date?.trim() || null,
        }
        await createMutation.mutateAsync(payload)
        toastSuccess("Invoice created.", { id: "invoice-form" })
      }
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        // The no-active-enrollment `422` arrives as a form-level message (no
        // field key) — surface it in the banner.
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the invoice.", { id: "invoice-form" })
    }
  })

  const submitting = form.formState.isSubmitting
  const years = React.useMemo(() => selectableYears(), [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader icon={<Receipt />}>
          <DialogTitle>{isEdit ? "Edit invoice" : "New invoice"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this invoice's items, due date, or period. The total is the sum of the items; paid amount and status follow the recorded payments."
              : "Create an invoice for a student's current enrolment. Add a line for each charge — the total is their sum. The invoice number is generated automatically."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

            {/* Student */}
            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Student</FormLabel>
                  {studentLocked ? (
                    <div className="flex h-10 items-center rounded-lg border border-surface-border bg-subtle/50 px-3 text-sm text-copy-primary">
                      {lockedLabel}
                    </div>
                  ) : (
                    <FormControl>
                      <StudentField
                        value={field.value}
                        disabled={submitting}
                        error={
                          form.formState.errors.student_id?.message ?? undefined
                        }
                        onSelect={(student) => field.onChange(student.id)}
                      />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Period */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Month</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ""}
                        onValueChange={(next) => field.onChange(next ?? "")}
                        disabled={submitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select month">
                            {(v: string) =>
                              INVOICE_MONTHS[Number(v) - 1]?.label ?? "Select month"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {INVOICE_MONTHS.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Year</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ""}
                        onValueChange={(next) => field.onChange(next ?? "")}
                        disabled={submitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Line items */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <FormLabel required className="mb-0">
                  Items
                </FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => itemFields.append({ ...EMPTY_ITEM })}
                >
                  <Plus className="size-4" aria-hidden />
                  Add item
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                {itemFields.fields.map((row, index) => (
                  <div key={row.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              disabled={submitting}
                              placeholder="Description (e.g. Tuition fee)"
                              autoComplete="off"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="w-32 shrink-0">
                          <FormControl>
                            <div className="relative">
                              <span
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-copy-muted"
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
                                className="pl-7 tabular-nums"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-0.5 shrink-0 text-copy-muted hover:text-destructive"
                      disabled={submitting || itemFields.fields.length === 1}
                      aria-label="Remove item"
                      onClick={() => itemFields.remove(index)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Array-level error (e.g. no items) surfaces here. */}
              {form.formState.errors.items?.message ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.items.message}
                </p>
              ) : null}

              {/* Live total — the sum of the item amounts. */}
              <div className="mt-1 flex items-center justify-between border-t border-surface-border pt-2.5">
                <span className="text-sm text-copy-muted">Total</span>
                <span className="text-base font-semibold tabular-nums text-copy-primary">
                  {formatMoney(total)}
                </span>
              </div>
            </div>

            {/* Due date */}
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="sm:max-w-[50%]">
                  <FormLabel>Due date</FormLabel>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : isEdit ? (
                  "Save changes"
                ) : (
                  "Create invoice"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * A single-student search + select field for invoice create. Searches the
 * students list (`GET /students?search=`) and reports the chosen student. Once a
 * student is picked its label shows in the trigger; typing again reopens the
 * results to change it.
 */
function StudentField({
  value,
  disabled,
  error,
  onSelect,
}: {
  value: string
  disabled?: boolean
  error?: string
  onSelect: (student: StudentListItem) => void
}) {
  const [searchInput, setSearchInput] = React.useState("")
  // The last-picked student, so the field can show its label without a lookup.
  const [selected, setSelected] = React.useState<StudentListItem | null>(null)
  const search = useDebouncedValue(searchInput, 250)
  const active = search.trim().length > 0

  const { data, isPending, isError, isFetching, refetch } = useStudents({
    search,
    page: 1,
    per_page: 6,
  })

  const students = data?.data ?? []

  return (
    <div className="flex flex-col gap-2">
      {value && selected ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-brand/40 bg-brand-dim/40 px-3 py-2 text-sm">
          <span className="truncate font-medium text-copy-primary">
            {studentDisplayName(selected)}
          </span>
          <span className="shrink-0 text-xs text-copy-muted">Selected</span>
        </div>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
          aria-hidden
        />
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={
            value
              ? "Search to change student…"
              : "Search students by name, admission no, or mobile…"
          }
          className="h-9 pl-8"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
        />
      </div>

      {active ? (
        <div
          className="rounded-xl border border-surface-border bg-subtle/40 p-2"
          aria-busy={isFetching}
        >
          {isPending ? (
            <div className="flex h-24 items-center justify-center text-sm text-copy-muted">
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              Loading students…
            </div>
          ) : isError ? (
            <div className="flex h-24 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-copy-muted">Couldn&rsquo;t load students.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                Retry
              </Button>
            </div>
          ) : students.length === 0 ? (
            <div className="flex h-24 flex-col items-center justify-center gap-1 text-center text-copy-muted">
              <GraduationCap className="size-5" aria-hidden />
              <p className="text-sm">No matching students.</p>
            </div>
          ) : (
            <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto">
              {students.map((student) => {
                const checked = student.id === value
                return (
                  <li key={student.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onSelect(student)
                        setSelected(student)
                        setSearchInput("")
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                      aria-pressed={checked}
                    >
                      <Avatar className="size-8 shrink-0">
                        {student.photo_url ? (
                          <AvatarImage src={student.photo_url} alt="" />
                        ) : null}
                        <AvatarFallback>
                          {studentInitials(student)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-copy-primary">
                          {studentDisplayName(student)}
                        </span>
                        <span className="block truncate text-xs text-copy-muted">
                          {[student.admission_no, student.class, student.section]
                            .filter(Boolean)
                            .join(" · ") || "No current class"}
                        </span>
                      </span>
                      {checked ? (
                        <Check className="size-4 shrink-0 text-brand" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
