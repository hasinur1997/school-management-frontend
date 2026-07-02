"use client"

/**
 * Create/edit dialog for an exam (task 4.1). One component, both modes — an
 * `exam` prop switches to edit. RHF + Zod, `422` → field errors + form-level
 * banner, success toast + close, no double submit (`code-standards.md`, Forms).
 *
 * Create sets session/type/name/dates and the class targeting: an explicit set
 * of classes or every class in the branch (`all_classes`). Super admin also picks
 * the branch (`branch_id`); everyone else is scoped server-side. No field is
 * disabled on edit, but the API treats session and type as immutable and rejects
 * the `published` status on a generic update — so the edit payload simply omits
 * session/type and only sends a status the API accepts. The exam type drives the
 * downstream result weighting (25% S1 + 25% S2 + 50% final), computed
 * server-side; the form only sets the type.
 */

import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckIcon, ClipboardList } from "lucide-react"

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
import { DatePicker } from "@workspace/ui/components/date-picker"
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
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { SessionSelect } from "@/components/academic/session-select"
import { BranchSelect } from "@/components/branch/branch-select"
import { useBranch } from "@/components/branch/branch-provider"
import { useCreateExam, useUpdateExam } from "@/hooks/exams"
import {
  EXAM_EDITABLE_STATUSES,
  EXAM_STATUS_LABELS,
  EXAM_TYPE_LABELS,
  EXAM_TYPES,
  type Exam,
  type ExamInput,
  type ExamStatus,
  type ExamType,
  type ExamUpdateInput,
} from "@/types/exam"
import { ClassMultiSelect } from "./class-multi-select"

const schema = z
  .object({
    session_id: z.string().min(1, "Session is required"),
    type: z.string().min(1, "Type is required"),
    name: z.string().trim().min(1, "Name is required").max(100, "Keep it under 100 characters"),
    all_classes: z.boolean(),
    class_ids: z.array(z.string()),
    // Super-admin only — required at submit; null/omitted for everyone else.
    branch_id: z.string().nullable(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    status: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.all_classes && values.class_ids.length === 0) {
      ctx.addIssue({
        path: ["class_ids"],
        code: z.ZodIssueCode.custom,
        message: "Select at least one class, or choose All classes.",
      })
    }
    if (
      values.start_date &&
      values.end_date &&
      values.end_date < values.start_date
    ) {
      ctx.addIssue({
        path: ["end_date"],
        code: z.ZodIssueCode.custom,
        message: "End date can't be before the start date.",
      })
    }
  })

type ExamFormValues = z.infer<typeof schema>

// 422 field names that map to an input.
const FIELD_NAMES = [
  "session_id",
  "type",
  "name",
  "all_classes",
  "class_ids",
  "branch_id",
  "start_date",
  "end_date",
  "status",
] as const

function toDefaults(
  exam: Exam | undefined,
  activeBranchId: string | null
): ExamFormValues {
  return {
    session_id: exam?.session_id ?? "",
    type: exam?.type ?? "",
    name: exam?.name ?? "",
    all_classes: exam?.all_classes ?? false,
    class_ids: exam?.class_ids ?? [],
    // Pre-fill the exam's own branch on edit; otherwise default super admin to
    // the active branch. Non-super-admin stays null and never sends it.
    branch_id: exam?.branch_id ?? activeBranchId,
    start_date: exam?.start_date ?? "",
    end_date: exam?.end_date ?? "",
    status: exam?.status ?? "upcoming",
  }
}

export interface ExamFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present → edit that exam; absent → create a new one. */
  exam?: Exam
}

export function ExamFormDialog({
  open,
  onOpenChange,
  exam,
}: ExamFormDialogProps) {
  const isEdit = exam != null
  const { isSuperAdmin, activeBranchId } = useBranch()
  const createMutation = useCreateExam()
  const updateMutation = useUpdateExam()

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(undefined, activeBranchId),
  })
  const [banner, setBanner] = React.useState<string | null>(null)
  const allClasses = useWatch({ control: form.control, name: "all_classes" })

  React.useEffect(() => {
    if (!open) return
    form.reset(toDefaults(exam, activeBranchId))
  }, [open, exam, activeBranchId, form])

  function handleOpenChange(next: boolean) {
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)

    // Super admin must scope the exam to a branch (the API needs it to place an
    // all-classes exam; everyone else is auto-scoped server-side).
    if (isSuperAdmin && !values.branch_id) {
      form.setError("branch_id", { message: "Select a branch" })
      return
    }

    try {
      if (isEdit) {
        // The API treats session and type as immutable (it rejects them with a
        // `prohibited` error), and only accepts the editable statuses — so we
        // never send session/type and only send a valid status. No field is
        // locked in the UI; we just omit what the API won't accept.
        const status = (values.status || exam.status) as ExamStatus
        const payload: ExamUpdateInput = {
          name: values.name,
          all_classes: values.all_classes,
          ...(values.all_classes ? {} : { class_ids: values.class_ids }),
          ...(EXAM_EDITABLE_STATUSES.includes(status) ? { status } : {}),
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          ...(isSuperAdmin && values.branch_id
            ? { branch_id: values.branch_id }
            : {}),
        }
        await updateMutation.mutateAsync({ id: exam.id, ...payload })
        toastSuccess("Exam updated.", { id: "exam-form" })
      } else {
        const payload: ExamInput = {
          session_id: values.session_id,
          type: values.type as ExamType,
          name: values.name,
          all_classes: values.all_classes,
          // Omit the explicit list for an all-classes exam.
          ...(values.all_classes ? {} : { class_ids: values.class_ids }),
          // Super admin scopes the exam to a branch; everyone else omits it.
          ...(isSuperAdmin && values.branch_id
            ? { branch_id: values.branch_id }
            : {}),
          start_date: values.start_date || null,
          end_date: values.end_date || null,
        }
        await createMutation.mutateAsync(payload)
        toastSuccess("Exam created.", { id: "exam-form" })
      }
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        // Class-array errors may arrive keyed `class_ids.0` etc.
        const classError =
          error.first("class_ids") ||
          (Object.keys(error.errors).some((k) => k.startsWith("class_ids"))
            ? "Check the selected classes."
            : null)
        if (classError) form.setError("class_ids", { message: classError })
        if (mapped || classError) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the exam.", { id: "exam-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader icon={<ClipboardList />}>
          <DialogTitle>{isEdit ? "Edit exam" : "New exam"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this exam's details."
              : "Create an exam for one or more classes in a session. The type sets how its result is weighted."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
            <FormBanner message={banner} />

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
                      The branch this exam belongs to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Type</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ""}
                        onValueChange={(next) => field.onChange(next ?? "")}
                        disabled={submitting}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type">
                            {(v: string) =>
                              EXAM_TYPE_LABELS[v as ExamType] ?? "Select type"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {EXAM_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {EXAM_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Weighting: 25% first + 25% second + 50% final.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="class_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Classes</FormLabel>
                  <FormControl>
                    <ClassMultiSelect
                      value={field.value}
                      onChange={field.onChange}
                      allClasses={allClasses}
                      onAllClassesChange={(all) =>
                        form.setValue("all_classes", all, {
                          shouldValidate: true,
                        })
                      }
                      disabled={submitting}
                      aria-invalid={!!form.formState.errors.class_ids}
                    />
                  </FormControl>
                  <FormDescription>
                    Pick the classes this exam is held for, or choose All classes.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                        placeholder="e.g. First Semester 2026"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isEdit ? (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || "upcoming"}
                          onValueChange={(next) =>
                            field.onChange(next ?? "upcoming")
                          }
                          disabled={submitting}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {(v: string) =>
                                EXAM_STATUS_LABELS[v as ExamStatus] ??
                                "Upcoming"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {EXAM_EDITABLE_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {EXAM_STATUS_LABELS[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>
                        Set this exam&apos;s lifecycle stage.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        disabled={submitting}
                        placeholder="Start date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        disabled={submitting}
                        placeholder="End date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Create exam"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
