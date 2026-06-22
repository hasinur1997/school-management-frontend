"use client"

/**
 * Approve an admission application (task 2.6). Approval is the office-use box
 * that converts an application into a student, so it collects the academic
 * session, the class (defaults to the desired class, may be overridden) + its
 * section, a roll number, an optional admission number (auto-generated when
 * blank), and whether to also create a linked parent account
 * (`ApproveAdmissionRequest`). RHF + Zod; `422` (incl. the roll-uniqueness and
 * branch-scoped class/section checks) maps back onto the fields.
 *
 * Two phases in one dialog: the form, then a result panel summarising the
 * created student + enrollment (the server generates a random password and
 * dispatches login credentials to the student, and the parent when created — no
 * credentials are built client-side). On success the cache invalidation
 * refetches the queue/detail so the row leaves the pending list.
 */

import * as React from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Mail, UserPlus } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button, buttonVariants } from "@/components/button"
import { ClassSelect, SectionSelect, SessionSelect } from "@/components/academic"
import { FormBanner, applyFieldErrors } from "@/components/academic/management/form-helpers"
import { cn } from "@workspace/ui/lib/utils"
import { isValidationError } from "@/lib/api"
import { toastError } from "@/lib/toast"
import { useSessions } from "@/hooks/academic"
import { useApproveAdmission } from "@/hooks/admissions"
import {
  admissionApplicantName,
  type Admission,
  type AdmissionApproveResponse,
  type ParentRelation,
} from "@/types/admission"

const RELATIONS: { value: ParentRelation; label: string }[] = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
]

const schema = z
  .object({
    session_id: z.number().int().positive().nullable(),
    class_id: z.number().int().positive().nullable(),
    section_id: z.number().int().positive().nullable(),
    roll_no: z.number().int().positive().nullable(),
    admission_no: z.string().trim().max(30).optional(),
    create_parent_account: z.boolean(),
    parent_relation: z.enum(["father", "mother", "guardian"]).nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.session_id == null) {
      ctx.addIssue({ path: ["session_id"], code: z.ZodIssueCode.custom, message: "Select a session" })
    }
    if (values.class_id == null) {
      ctx.addIssue({ path: ["class_id"], code: z.ZodIssueCode.custom, message: "Select a class" })
    }
    if (values.section_id == null) {
      ctx.addIssue({ path: ["section_id"], code: z.ZodIssueCode.custom, message: "Select a section" })
    }
    if (values.roll_no == null) {
      ctx.addIssue({ path: ["roll_no"], code: z.ZodIssueCode.custom, message: "Enter a roll number" })
    }
    if (values.create_parent_account && values.parent_relation == null) {
      ctx.addIssue({
        path: ["parent_relation"],
        code: z.ZodIssueCode.custom,
        message: "Select a relation",
      })
    }
  })

type ApproveFormValues = z.infer<typeof schema>

const FIELD_NAMES = [
  "session_id",
  "class_id",
  "section_id",
  "roll_no",
  "admission_no",
  "create_parent_account",
  "parent_relation",
] as const

export interface ApproveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admission: Admission | null
}

export function ApproveDialog({ open, onOpenChange, admission }: ApproveDialogProps) {
  const approve = useApproveAdmission()
  const { data: sessions } = useSessions()
  const [result, setResult] = React.useState<AdmissionApproveResponse | null>(null)
  const [banner, setBanner] = React.useState<string | null>(null)

  const form = useForm<ApproveFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      session_id: null,
      class_id: null,
      section_id: null,
      roll_no: null,
      admission_no: "",
      create_parent_account: false,
      parent_relation: null,
    },
  })

  // Seed the form each time the dialog opens: default the session to the current
  // one and the class to the applicant's desired class.
  React.useEffect(() => {
    if (!open) return
    form.reset({
      session_id: sessions?.find((s) => s.is_current)?.id ?? null,
      class_id: admission?.desired_class?.id ?? null,
      section_id: null,
      roll_no: null,
      admission_no: "",
      create_parent_account: false,
      parent_relation: null,
    })
  }, [open, admission, sessions, form])

  const submitting = form.formState.isSubmitting
  const classId = form.watch("class_id")
  const createParent = form.watch("create_parent_account")

  // Reset the result + banner on close (kept out of the open effect to avoid a
  // synchronous setState during render). The dialog always closes between rows.
  function close() {
    setResult(null)
    setBanner(null)
    onOpenChange(false)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!admission) return
    setBanner(null)
    try {
      const res = await approve.mutateAsync({
        id: admission.id,
        session_id: values.session_id!,
        class_id: values.class_id!,
        section_id: values.section_id!,
        roll_no: values.roll_no!,
        admission_no: values.admission_no?.trim() ? values.admission_no.trim() : null,
        create_parent_account: values.create_parent_account,
        parent_relation: values.create_parent_account ? values.parent_relation : null,
      })
      setResult(res ?? {})
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applyFieldErrors(form, error, FIELD_NAMES)
        if (mapped) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't approve this application.", { id: "admission-approve" })
      setBanner("Couldn't approve this application. Please try again.")
    }
  })

  const name = admission ? admissionApplicantName(admission) : ""
  const student = result?.student
  const enrollment = student?.enrollment

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !submitting && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success" aria-hidden />
                Application approved
              </DialogTitle>
              <DialogDescription>
                A student record was created for {name}.
              </DialogDescription>
            </DialogHeader>

            <dl className="flex flex-col divide-y divide-surface-border rounded-lg border border-surface-border bg-base/40 px-3">
              <ResultRow label="Admission no." value={student?.admission_no} />
              <ResultRow label="Session" value={enrollment?.session} />
              <ResultRow label="Class" value={enrollment?.class} />
              <ResultRow label="Section" value={enrollment?.section} />
              <ResultRow
                label="Roll no."
                value={enrollment?.roll_no != null ? String(enrollment.roll_no) : null}
              />
            </dl>

            <div className="flex items-start gap-2 rounded-lg border border-surface-border bg-base/40 p-3 text-sm text-copy-secondary">
              <Mail className="mt-0.5 size-4 shrink-0 text-copy-muted" aria-hidden />
              <span>
                Login credentials were generated and sent to the student
                {result.parent_created ? " and the linked parent account" : ""}.
              </span>
            </div>

            <DialogFooter>
              {student?.id != null ? (
                <Link
                  href={`/students/${student.id}`}
                  className={cn(buttonVariants({ variant: "outline" }))}
                  onClick={close}
                >
                  <UserPlus className="size-4" aria-hidden />
                  View student
                </Link>
              ) : null}
              <Button type="button" onClick={close}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Approve application</DialogTitle>
              <DialogDescription>
                Admit <span className="font-medium">{name}</span> — this creates a
                student record and sends login credentials. It can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
                <FormBanner message={banner} />

                <FormField
                  control={form.control}
                  name="session_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session</FormLabel>
                      <FormControl>
                        <SessionSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={submitting}
                          aria-label="Session"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="class_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <FormControl>
                          <ClassSelect
                            value={field.value}
                            onValueChange={(next) => {
                              field.onChange(next)
                              form.setValue("section_id", null)
                            }}
                            disabled={submitting}
                            aria-label="Class"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="section_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section</FormLabel>
                        <FormControl>
                          <SectionSelect
                            classId={classId}
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={submitting}
                            aria-label="Section"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="roll_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Roll number</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const v = e.target.value
                              field.onChange(v === "" ? null : Number(v))
                            }}
                            disabled={submitting}
                            aria-label="Roll number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="admission_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admission no.</FormLabel>
                        <FormControl>
                          <Input
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            placeholder="Auto-generated"
                            disabled={submitting}
                            aria-label="Admission number"
                          />
                        </FormControl>
                        <FormDescription>Leave blank to auto-generate.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="create_parent_account"
                  render={({ field }) => (
                    <FormItem className="rounded-lg border border-surface-border p-3">
                      <label className="flex items-start gap-3">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => {
                              field.onChange(e.target.checked)
                              if (!e.target.checked) form.setValue("parent_relation", null)
                            }}
                            disabled={submitting}
                            className="mt-0.5 size-4 shrink-0 rounded border-input accent-brand"
                          />
                        </FormControl>
                        <span className="text-sm">
                          <span className="font-medium text-copy-primary">
                            Create a parent account
                          </span>
                          <span className="block text-copy-muted">
                            Also create a linked guardian login.
                          </span>
                        </span>
                      </label>
                    </FormItem>
                  )}
                />

                {createParent ? (
                  <FormField
                    control={form.control}
                    name="parent_relation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent relation</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value ?? undefined}
                            onValueChange={field.onChange}
                            disabled={submitting}
                          >
                            <SelectTrigger aria-label="Parent relation" className="w-full">
                              <SelectValue placeholder="Select relation">
                                {(v: ParentRelation) =>
                                  RELATIONS.find((r) => r.value === v)?.label
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {RELATIONS.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
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
                    onClick={close}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={submitting}>
                    {submitting ? "Approving…" : "Approve & admit"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ResultRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <dt className="text-copy-muted">{label}</dt>
      <dd className="font-medium text-copy-primary">{value || "—"}</dd>
    </div>
  )
}
