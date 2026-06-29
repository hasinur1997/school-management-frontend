"use client"

/**
 * Edit dialog for a student profile (task 2.7). Students are created through the
 * admissions-approval flow (task 2.6), so this is edit-only — it updates the
 * mutable profile fields via `PUT /students/{id}`. RHF + Zod, `422` → field
 * errors + a form-level banner, success toast + close, no double submit
 * (`code-standards.md`, Forms).
 *
 * admission_no and birth_reg_no are immutable identity columns: they're shown
 * disabled (read-only) and never sent. The API explicitly prohibits changing
 * them (422) — the disabled inputs are the UX, the API stays authoritative.
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
import { GraduationCapIcon } from "lucide-react"
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
import { Button } from "@/components/button"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { AddressFieldset } from "./address-fieldset"
import { useUpdateStudent } from "@/hooks/students"
import {
  studentDisplayName,
  type Student,
  type StudentUpdateInput,
} from "@/types/student"

const schema = z.object({
  name_bn: z.string().trim().min(1, "Required"),
  name_en: z.string().trim().min(1, "Required"),
  student_email: z
    .union([z.literal(""), z.email("Enter a valid email").max(150, "Maximum 150 characters")])
    .optional(),

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
})

type StudentFormValues = z.infer<typeof schema>

const FIELD_NAMES = [
  "name_bn",
  "name_en",
  "student_email",
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
] as const

function toDefaults(student: Student): StudentFormValues {
  return {
    name_bn: student.name_bn ?? "",
    name_en: student.name_en ?? "",
    student_email: student.student_email ?? "",
    father_name_bn: student.father_name_bn ?? "",
    father_name_en: student.father_name_en ?? "",
    father_nid: student.father_nid ?? "",
    mother_name_bn: student.mother_name_bn ?? "",
    mother_name_en: student.mother_name_en ?? "",
    mother_nid: student.mother_nid ?? "",
    present_village: student.present_village ?? "",
    present_post_office: student.present_post_office ?? "",
    present_upazila: student.present_upazila ?? "",
    present_district: student.present_district ?? "",
    present_division: student.present_division ?? "",
    permanent_village: student.permanent_village ?? "",
    permanent_post_office: student.permanent_post_office ?? "",
    permanent_upazila: student.permanent_upazila ?? "",
    permanent_district: student.permanent_district ?? "",
    permanent_division: student.permanent_division ?? "",
    // Pre-tick when the stored permanent address already equals the present one.
    permanent_same_as_present: permanentMatchesPresent(student),
    father_mobile: student.father_mobile ?? "",
    mother_mobile: student.mother_mobile ?? "",
    father_email: student.father_email ?? "",
    mother_email: student.mother_email ?? "",
    date_of_birth: student.date_of_birth ?? "",
    religion: student.religion ?? "",
    nationality: student.nationality ?? "",
    caste: student.caste ?? "",
  }
}

/** True when every stored permanent address field equals its present counterpart. */
function permanentMatchesPresent(student: Student): boolean {
  const parts = [
    "village",
    "post_office",
    "upazila",
    "district",
    "division",
  ] as const
  return parts.every((p) => {
    const present = student[`present_${p}` as keyof Student] ?? ""
    const permanent = student[`permanent_${p}` as keyof Student] ?? ""
    return present !== "" && present === permanent
  })
}

export interface StudentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
}: StudentFormDialogProps) {
  const updateMutation = useUpdateStudent()

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: student ? toDefaults(student) : undefined,
  })
  const [banner, setBanner] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open || !student) return
    form.reset(toDefaults(student))
  }, [open, student, form])

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
    if (form.formState.isSubmitting) return
    if (!next) setBanner(null)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (!student) return
    setBanner(null)

    // permanent_same_as_present is UI-only — drop it from the API payload.
    const { permanent_same_as_present: _sameAsPresent, ...fields } = values

    const payload: StudentUpdateInput = {
      ...fields,
      student_email: fields.student_email?.trim() ? fields.student_email.trim() : null,
      // birth_reg_no stays read-only here (edited inline on the detail page); the
      // current value is resent unchanged so the required field is satisfied.
      birth_reg_no: student.birth_reg_no ?? "",
      father_nid: fields.father_nid || null,
      mother_nid: fields.mother_nid || null,
      mother_mobile: fields.mother_mobile || null,
      father_email: fields.father_email?.trim() ? fields.father_email.trim() : null,
      mother_email: fields.mother_email?.trim() ? fields.mother_email.trim() : null,
      caste: fields.caste || null,
    }

    try {
      await updateMutation.mutateAsync({ id: student.id, ...payload })
      toastSuccess("Student updated.", { id: "student-form" })
      onOpenChange(false)
    } catch (error) {
      if (isValidationError(error)) {
        if (applyFieldErrors(form, error, FIELD_NAMES)) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the student.", { id: "student-form" })
    }
  })

  const submitting = form.formState.isSubmitting

  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader icon={<GraduationCapIcon />}>
          <DialogTitle>Edit student</DialogTitle>
          <DialogDescription>
            Update {studentDisplayName(student)}&rsquo;s profile. The admission
            number and birth registration number can&rsquo;t be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
            <FormBanner message={banner} />

            {/* Identity (immutable ids shown read-only) */}
            <Section title="Student">
              <ReadOnlyField label="Admission no" value={student.admission_no} />
              <ReadOnlyField
                label="Birth registration no"
                value={student.birth_reg_no}
              />
              <TextField form={form} name="name_en" label="Name (English)" disabled={submitting} />
              <TextField form={form} name="name_bn" label="Name (Bangla)" disabled={submitting} />
              <TextField
                form={form}
                name="student_email"
                label="Email (optional)"
                type="email"
                disabled={submitting}
              />
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        disabled={submitting}
                        placeholder="Date of birth"
                        captionLayout="dropdown"
                        startMonth={new Date(1950, 0)}
                        endMonth={new Date()}
                        disabledDates={{ after: new Date() }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <TextField form={form} name="religion" label="Religion" disabled={submitting} />
              <TextField form={form} name="nationality" label="Nationality" disabled={submitting} />
              <TextField form={form} name="caste" label="Caste (optional)" disabled={submitting} />
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
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
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
  form: ReturnType<typeof useForm<StudentFormValues>>
  name: keyof StudentFormValues
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

/** A disabled, read-only display of an immutable identity column. */
function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <FormControl>
        <Input value={value ?? "—"} disabled readOnly aria-readonly />
      </FormControl>
      <FormDescription>Immutable — can&rsquo;t be changed.</FormDescription>
    </FormItem>
  )
}
