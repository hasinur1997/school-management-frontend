"use client"

/**
 * Create a student directly (the office path) via `POST /students`. Distinct
 * from the admissions-approval flow (task 2.6): this mints a student, their
 * login, and an active enrollment in one call, sending login credentials to the
 * student (and an optional linked parent) — no application is involved.
 *
 * Collects the full profile (the same mutable set as the edit dialog, plus the
 * required birth registration number), the initial enrollment (session / class /
 * section / roll), an optional admission number (auto-generated when blank), and
 * the optional linked-parent box — mirroring `StoreStudentRequest`. Super admins
 * also choose the target branch; everyone else is auto-scoped by the API.
 *
 * RHF + Zod; `422` (incl. the roll-uniqueness and branch-scoped class/section
 * checks) maps back onto the fields, with a form-level banner fallback. Success
 * shows a toast and closes; no double submit (`code-standards.md`, Forms).
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { GraduationCapIcon } from "lucide-react"

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
import { Button } from "@/components/button"
import { ClassSelect, SectionSelect, SessionSelect } from "@/components/academic"
import { AddressFieldset } from "./address-fieldset"
import { BranchSelect } from "@/components/branch/branch-select"
import { useBranch } from "@/components/branch/branch-provider"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { useCreateStudent } from "@/hooks/students"
import type { StudentCreateInput } from "@/types/student"

const RELATIONS: { value: "father" | "mother" | "guardian"; label: string }[] = [
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "guardian", label: "Guardian" },
]

const schema = z
  .object({
    name_bn: z.string().trim().min(1, "Required"),
    name_en: z.string().trim().min(1, "Required"),
    student_email: z
      .union([z.literal(""), z.email("Enter a valid email").max(150, "Maximum 150 characters")])
      .optional(),

    birth_reg_no: z.string().trim().min(1, "Required"),

    father_name_bn: z.string().trim().min(1, "Required"),
    father_name_en: z.string().trim().min(1, "Required"),
    father_nid: z.string().trim().optional(),

    mother_name_bn: z.string().trim().min(1, "Required"),
    mother_name_en: z.string().trim().min(1, "Required"),
    mother_nid: z.string().trim().optional(),

    present_village: z.string().trim().min(1, "Required"),
    present_post_office: z.string().trim().min(1, "Required"),
    present_upazila: z.string().trim().min(1, "Required"),
    present_district: z.string().trim().min(1, "Required"),
    present_division: z.string().trim().min(1, "Required"),

    permanent_village: z.string().trim().min(1, "Required"),
    permanent_post_office: z.string().trim().min(1, "Required"),
    permanent_upazila: z.string().trim().min(1, "Required"),
    permanent_district: z.string().trim().min(1, "Required"),
    permanent_division: z.string().trim().min(1, "Required"),

    // UI-only: mirror the present address into the permanent one. Not sent.
    permanent_same_as_present: z.boolean(),

    father_mobile: z.string().trim().min(1, "Required"),
    mother_mobile: z.string().trim().optional(),
    father_email: z
      .union([z.literal(""), z.email("Enter a valid email").max(150, "Maximum 150 characters")])
      .optional(),
    mother_email: z
      .union([z.literal(""), z.email("Enter a valid email").max(150, "Maximum 150 characters")])
      .optional(),

    date_of_birth: z.string().trim().min(1, "Required"),
    religion: z.string().trim().min(1, "Required"),
    nationality: z.string().trim().min(1, "Required"),
    caste: z.string().trim().optional(),

    // Academic ids are opaque public-id hashes; roll_no is numeric.
    session_id: z.string().min(1).nullable(),
    class_id: z.string().min(1).nullable(),
    section_id: z.string().min(1).nullable(),
    roll_no: z.number().int().positive().nullable(),
    admission_no: z.string().trim().max(30).optional(),

    create_parent_account: z.boolean(),
    parent_relation: z.enum(["father", "mother", "guardian"]).nullable(),
    parent_email: z
      .union([z.literal(""), z.email("Enter a valid email").max(150, "Maximum 150 characters")])
      .optional(),

    branch_id: z.string().min(1).nullable(),
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
      ctx.addIssue({ path: ["parent_relation"], code: z.ZodIssueCode.custom, message: "Select a relation" })
    }
    const studentEmail = values.student_email?.trim()
    const parentEmail = values.parent_email?.trim()
    if (
      values.create_parent_account &&
      studentEmail &&
      parentEmail &&
      studentEmail.toLowerCase() === parentEmail.toLowerCase()
    ) {
      ctx.addIssue({
        path: ["parent_email"],
        code: z.ZodIssueCode.custom,
        message: "Parent email must be different from student email",
      })
    }
  })

type CreateFormValues = z.infer<typeof schema>

const FIELD_NAMES = [
  "name_bn",
  "name_en",
  "student_email",
  "birth_reg_no",
  "father_name_bn",
  "father_name_en",
  "father_nid",
  "mother_name_bn",
  "mother_name_en",
  "mother_nid",
  "present_village",
  "present_post_office",
  "present_upazila",
  "present_district",
  "present_division",
  "permanent_village",
  "permanent_post_office",
  "permanent_upazila",
  "permanent_district",
  "permanent_division",
  "father_mobile",
  "mother_mobile",
  "father_email",
  "mother_email",
  "date_of_birth",
  "religion",
  "nationality",
  "caste",
  "session_id",
  "class_id",
  "section_id",
  "roll_no",
  "admission_no",
  "create_parent_account",
  "parent_relation",
  "parent_email",
  "branch_id",
] as const

function emptyDefaults(branchId: string | null): CreateFormValues {
  return {
    name_bn: "",
    name_en: "",
    student_email: "",
    birth_reg_no: "",
    father_name_bn: "",
    father_name_en: "",
    father_nid: "",
    mother_name_bn: "",
    mother_name_en: "",
    mother_nid: "",
    present_village: "",
    present_post_office: "",
    present_upazila: "",
    present_district: "",
    present_division: "",
    permanent_village: "",
    permanent_post_office: "",
    permanent_upazila: "",
    permanent_district: "",
    permanent_division: "",
    permanent_same_as_present: false,
    father_mobile: "",
    mother_mobile: "",
    father_email: "",
    mother_email: "",
    date_of_birth: "",
    religion: "",
    nationality: "Bangladeshi",
    caste: "",
    session_id: null,
    class_id: null,
    section_id: null,
    roll_no: null,
    admission_no: "",
    create_parent_account: false,
    parent_relation: null,
    parent_email: "",
    branch_id: branchId,
  }
}

export interface StudentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StudentCreateDialog({ open, onOpenChange }: StudentCreateDialogProps) {
  const { isSuperAdmin, activeBranchId } = useBranch()
  const createMutation = useCreateStudent()

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyDefaults(activeBranchId),
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    form.reset(emptyDefaults(activeBranchId))
  }, [open, activeBranchId, form])

  const submitting = form.formState.isSubmitting
  const classId = form.watch("class_id")
  const createParent = form.watch("create_parent_account")

  // While "same as present" is ticked, keep the permanent address mirrored to
  // the present one (including later edits to the present fields).
  const sameAsPresent = form.watch("permanent_same_as_present")
  const presentDivision = form.watch("present_division")
  const presentDistrict = form.watch("present_district")
  const presentUpazila = form.watch("present_upazila")
  const presentPostOffice = form.watch("present_post_office")
  const presentVillage = form.watch("present_village")

  React.useEffect(() => {
    if (!sameAsPresent) return
    const opts = { shouldValidate: false, shouldDirty: true } as const
    form.setValue("permanent_division", presentDivision, opts)
    form.setValue("permanent_district", presentDistrict, opts)
    form.setValue("permanent_upazila", presentUpazila, opts)
    form.setValue("permanent_post_office", presentPostOffice, opts)
    form.setValue("permanent_village", presentVillage, opts)
  }, [
    form,
    sameAsPresent,
    presentDivision,
    presentDistrict,
    presentUpazila,
    presentPostOffice,
    presentVillage,
  ])

  function handleOpenChange(next: boolean) {
    if (submitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)

    // Super admin must scope the new student to a branch (the API requires it
    // in the body; everyone else is auto-scoped server-side).
    if (isSuperAdmin && values.branch_id == null) {
      form.setError("branch_id", { message: "Select a branch" })
      return
    }

    const payload: StudentCreateInput = {
      name_bn: values.name_bn,
      name_en: values.name_en,
      student_email: values.student_email?.trim() ? values.student_email.trim() : null,
      birth_reg_no: values.birth_reg_no,
      father_name_bn: values.father_name_bn,
      father_name_en: values.father_name_en,
      father_nid: values.father_nid || null,
      mother_name_bn: values.mother_name_bn,
      mother_name_en: values.mother_name_en,
      mother_nid: values.mother_nid || null,
      present_village: values.present_village,
      present_post_office: values.present_post_office,
      present_upazila: values.present_upazila,
      present_district: values.present_district,
      present_division: values.present_division,
      permanent_village: values.permanent_village,
      permanent_post_office: values.permanent_post_office,
      permanent_upazila: values.permanent_upazila,
      permanent_district: values.permanent_district,
      permanent_division: values.permanent_division,
      father_mobile: values.father_mobile,
      mother_mobile: values.mother_mobile || null,
      father_email: values.father_email?.trim() ? values.father_email.trim() : null,
      mother_email: values.mother_email?.trim() ? values.mother_email.trim() : null,
      date_of_birth: values.date_of_birth,
      religion: values.religion,
      nationality: values.nationality,
      caste: values.caste || null,
      session_id: values.session_id!,
      class_id: values.class_id!,
      section_id: values.section_id!,
      roll_no: values.roll_no!,
      admission_no: values.admission_no?.trim() ? values.admission_no.trim() : null,
      create_parent_account: values.create_parent_account,
      parent_relation: values.create_parent_account ? values.parent_relation : null,
      parent_email:
        values.create_parent_account && values.parent_email?.trim()
          ? values.parent_email.trim()
          : null,
      ...(isSuperAdmin && values.branch_id != null ? { branch_id: values.branch_id } : {}),
    }

    try {
      await createMutation.mutateAsync(payload)
      toastSuccess("Student created. Credentials are being sent.", { id: "student-create" })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        if (applyFieldErrors(form, error, FIELD_NAMES)) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't create the student.", { id: "student-create" })
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader icon={<GraduationCapIcon />}>
          <DialogTitle>New student</DialogTitle>
          <DialogDescription>
            Create a student record and enrollment directly. Login credentials are
            generated and sent to the student (and a linked parent, if requested).
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
            <FormBanner message={banner} />

            {isSuperAdmin ? (
              <Section title="Branch">
                <FormField
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <FormControl>
                        <BranchSelect
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={submitting}
                          aria-label="Branch"
                        />
                      </FormControl>
                      <FormDescription>The branch this student belongs to.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Section>
            ) : null}

            {/* Identity */}
            <Section title="Student">
              <TextField form={form} name="name_en" label="Name (English)" disabled={submitting} />
              <TextField form={form} name="name_bn" label="Name (Bangla)" disabled={submitting} />
              <TextField
                form={form}
                name="student_email"
                label="Email (optional)"
                type="email"
                disabled={submitting}
              />
              <TextField form={form} name="birth_reg_no" label="Birth registration no" disabled={submitting} />
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" disabled={submitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <TextField form={form} name="religion" label="Religion" disabled={submitting} />
              <TextField form={form} name="nationality" label="Nationality" disabled={submitting} />
              <TextField form={form} name="caste" label="Caste (optional)" disabled={submitting} />
            </Section>

            {/* Enrollment */}
            <Section title="Enrollment">
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
            </Section>

            {/* Guardians */}
            <Section title="Father">
              <TextField form={form} name="father_name_en" label="Name (English)" disabled={submitting} />
              <TextField form={form} name="father_name_bn" label="Name (Bangla)" disabled={submitting} />
              <TextField form={form} name="father_nid" label="NID (optional)" disabled={submitting} />
              <TextField form={form} name="father_mobile" label="Mobile" disabled={submitting} />
              <TextField form={form} name="father_email" label="Email (optional)" type="email" disabled={submitting} />
            </Section>
            <Section title="Mother">
              <TextField form={form} name="mother_name_en" label="Name (English)" disabled={submitting} />
              <TextField form={form} name="mother_name_bn" label="Name (Bangla)" disabled={submitting} />
              <TextField form={form} name="mother_nid" label="NID (optional)" disabled={submitting} />
              <TextField form={form} name="mother_mobile" label="Mobile (optional)" disabled={submitting} />
              <TextField form={form} name="mother_email" label="Email (optional)" type="email" disabled={submitting} />
            </Section>

            {/* Addresses — cascading Division → District → Upazila → Post office */}
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-semibold text-copy-primary">Present address</legend>
              <AddressFieldset form={form} prefix="present" disabled={submitting} />
            </fieldset>

            <FormField
              control={form.control}
              name="permanent_same_as_present"
              render={({ field }) => (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-copy-secondary">
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={submitting}
                    className="size-4 rounded border-surface-border accent-brand"
                  />
                  Permanent address is the same as present
                </label>
              )}
            />

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-semibold text-copy-primary">Permanent address</legend>
              {sameAsPresent ? (
                <p className="text-sm text-copy-muted">
                  Same as present address. Untick the box above to enter a different address.
                </p>
              ) : null}
              <AddressFieldset
                form={form}
                prefix="permanent"
                disabled={submitting || sameAsPresent}
              />
            </fieldset>

            {/* Parent account */}
            <Section title="Parent account">
              <FormField
                control={form.control}
                name="create_parent_account"
                render={({ field }) => (
                  <FormItem className="rounded-lg border border-surface-border p-3 sm:col-span-2">
                    <label className="flex items-start gap-3">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => {
                            field.onChange(e.target.checked)
                            if (!e.target.checked) {
                              form.setValue("parent_relation", null)
                              form.setValue("parent_email", "")
                            }
                          }}
                          disabled={submitting}
                          className="mt-0.5 size-4 shrink-0 rounded border-input accent-brand"
                        />
                      </FormControl>
                      <span className="text-sm">
                        <span className="font-medium text-copy-primary">Create a parent account</span>
                        <span className="block text-copy-muted">
                          Also create a linked guardian login.
                        </span>
                      </span>
                    </label>
                  </FormItem>
                )}
              />
              {createParent ? (
                <>
                  <FormField
                    control={form.control}
                    name="parent_relation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent relation</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={submitting}
                          >
                            <SelectTrigger aria-label="Parent relation" className="w-full">
                              <SelectValue placeholder="Select relation" />
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
                  <TextField
                    form={form}
                    name="parent_email"
                    label="Parent email (optional)"
                    type="email"
                    disabled={submitting}
                  />
                </>
              ) : null}
            </Section>

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
                {submitting ? "Creating…" : "Create student"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold text-copy-primary">{title}</legend>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

/**
 * A plain RHF text input field. Typed loosely on the field name to keep the
 * dense address/guardian grids readable; the `name` is constrained to the form
 * shape by the resolver.
 */
function TextField({
  form,
  name,
  label,
  type = "text",
  disabled,
}: {
  form: ReturnType<typeof useForm<CreateFormValues>>
  name: keyof CreateFormValues
  label: string
  type?: React.HTMLInputTypeAttribute
  disabled?: boolean
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
              type={type}
              inputMode={type === "email" ? "email" : undefined}
              autoComplete={type === "email" ? "email" : "off"}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
