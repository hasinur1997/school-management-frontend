"use client"

/**
 * Inline-editable profile cards for the student detail page (task 2.7).
 *
 * Each concern (identity, guardians, present/permanent address) renders as a
 * `DetailCard` that flips between a read-only row view and an inline edit form —
 * no modal. A `Pencil` action in the card header opens edit mode; Cancel/Save
 * sit in the card footer. Saving sends the full `PUT /students/{id}` payload
 * (the mutable fields merged with the card's edits), so editing one card never
 * drops another card's values. `422` → field errors + a form-level banner;
 * success → toast + back to the row view (`ui-context.md`, Forms / Feedback).
 *
 * Editing is gated on `student.update` and hidden for TC students (retired), the
 * same rule the hero manage actions use. admission_no / birth_reg_no / admitted
 * are immutable identity columns — shown as static rows, never edited.
 */

import * as React from "react"
import { MapPin, Pencil, User, Users } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { DetailCard, DetailRow } from "@/components/detail/detail-ui"
import {
  FormBanner,
  applyFieldErrors,
} from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { formatDate } from "@/lib/format"
import { toastError, toastSuccess } from "@/lib/toast"
import { useUpdateStudent } from "@/hooks/students"
import { AddressFieldset } from "./address-fieldset"
import type { Student, StudentUpdateInput } from "@/types/student"

/**
 * Per-field validation rules, mirroring `UpdateStudentRequest` (the same rules
 * the edit dialog used). Each card validates only its own subset; the API stays
 * authoritative.
 */
const FIELD_SCHEMAS = {
  name_en: z.string().trim().min(1, "Required"),
  name_bn: z.string().trim().min(1, "Required"),
  birth_reg_no: z.string().trim().min(1, "Required").max(25, "Too long"),
  date_of_birth: z.string().trim().min(1, "Required"),
  religion: z.string().trim().min(1, "Required"),
  nationality: z.string().trim().min(1, "Required"),
  caste: z.string().trim().optional(),

  father_name_en: z.string().trim().min(1, "Required"),
  father_name_bn: z.string().trim().min(1, "Required"),
  father_nid: z.string().trim().optional(),
  father_mobile: z.string().trim().min(1, "Required"),
  mother_name_en: z.string().trim().min(1, "Required"),
  mother_name_bn: z.string().trim().min(1, "Required"),
  mother_nid: z.string().trim().optional(),
  mother_mobile: z.string().trim().optional(),

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
} as const

type EditableName = keyof typeof FIELD_SCHEMAS

/** An editable row bound to a mutable profile field. */
interface EditRow {
  kind: "edit"
  name: EditableName
  label: string
  /** `date` renders a date input and formats the read-only value. */
  type?: "text" | "date"
  mono?: boolean
}

/** A read-only row (immutable identity column) — shown but never edited. */
interface StaticRow {
  kind: "static"
  label: string
  value: string | null
  mono?: boolean
}

type CardRow = EditRow | StaticRow

/** The full mutable payload as form strings (nulls → ""), built from a student. */
function studentToInput(student: Student): Record<EditableName, string> {
  return {
    name_en: student.name_en ?? "",
    name_bn: student.name_bn ?? "",
    birth_reg_no: student.birth_reg_no ?? "",
    date_of_birth: student.date_of_birth ?? "",
    religion: student.religion ?? "",
    nationality: student.nationality ?? "",
    caste: student.caste ?? "",
    father_name_en: student.father_name_en ?? "",
    father_name_bn: student.father_name_bn ?? "",
    father_nid: student.father_nid ?? "",
    father_mobile: student.father_mobile ?? "",
    mother_name_en: student.mother_name_en ?? "",
    mother_name_bn: student.mother_name_bn ?? "",
    mother_nid: student.mother_nid ?? "",
    mother_mobile: student.mother_mobile ?? "",
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
  }
}

/** Merge the card's edits over the full mutable set → the `PUT` payload. */
function buildPayload(
  student: Student,
  values: Partial<Record<EditableName, string>>
): StudentUpdateInput {
  const merged = { ...studentToInput(student), ...values }
  return {
    ...merged,
    father_nid: merged.father_nid || null,
    mother_nid: merged.mother_nid || null,
    mother_mobile: merged.mother_mobile || null,
    caste: merged.caste || null,
  }
}

/** The read-only display value for a row in view mode. */
function viewValue(student: Student, row: EditRow): string | null {
  const raw = studentToInput(student)[row.name]
  if (!raw) return null
  if (row.type === "date") return formatDate(raw)
  return raw
}

/** The inline form's value map — every editable field as a (possibly empty) string. */
type Values = Record<string, string | undefined>

/**
 * A single `DetailCard` that toggles between read-only rows and an inline edit
 * form. Shared by the identity / guardians sections; the `rows` prop drives both
 * views.
 */
function InlineEditCard({
  icon,
  title,
  student,
  editable,
  rows,
  className,
}: {
  icon: React.ElementType
  title: string
  student: Student
  editable: boolean
  rows: CardRow[]
  className?: string
}) {
  const update = useUpdateStudent()
  const [editing, setEditing] = React.useState(false)
  const [banner, setBanner] = React.useState<string | null>(null)

  const editRows = React.useMemo(
    () => rows.filter((r): r is EditRow => r.kind === "edit"),
    [rows]
  )
  const editNames = React.useMemo(() => editRows.map((r) => r.name), [editRows])

  const schema = React.useMemo(
    () =>
      z.object(
        Object.fromEntries(editRows.map((r) => [r.name, FIELD_SCHEMAS[r.name]]))
      ),
    [editRows]
  )

  const defaults = React.useMemo<Values>(() => {
    const input = studentToInput(student)
    return Object.fromEntries(editNames.map((n) => [n, input[n]]))
  }, [student, editNames])

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  })

  function startEdit() {
    form.reset(defaults)
    setBanner(null)
    setEditing(true)
  }

  function cancel() {
    if (form.formState.isSubmitting) return
    setBanner(null)
    setEditing(false)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await update.mutateAsync({
        id: student.id,
        ...buildPayload(student, values as Record<EditableName, string>),
      })
      toastSuccess(`${title} updated.`, { id: `student-${title}` })
      setEditing(false)
    } catch (error) {
      if (isValidationError(error)) {
        if (applyFieldErrors(form, error, editNames)) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save changes.", { id: `student-${title}` })
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <DetailCard
      icon={icon}
      title={title}
      className={className}
      action={
        editable && !editing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={startEdit}
            className="size-8 rounded-lg text-copy-muted hover:text-copy-primary"
            aria-label={`Edit ${title.toLowerCase()}`}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : null
      }
    >
      {editing ? (
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormBanner message={banner} />
            <div className="flex flex-col gap-3">
              {rows.map((row) =>
                row.kind === "static" ? (
                  <DetailRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    mono={row.mono}
                  />
                ) : (
                  <FormField
                    key={row.name}
                    control={form.control}
                    name={row.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{row.label}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type={row.type === "date" ? "date" : "text"}
                            disabled={submitting}
                            autoComplete="off"
                            className={row.mono ? "font-mono" : undefined}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={cancel}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div>
          {rows.map((row) =>
            row.kind === "static" ? (
              <DetailRow
                key={row.label}
                label={row.label}
                value={row.value}
                mono={row.mono}
              />
            ) : (
              <DetailRow
                key={row.name}
                label={row.label}
                value={viewValue(student, row)}
                mono={row.mono}
              />
            )
          )}
        </div>
      )}
    </DetailCard>
  )
}

/** Identity card — editable name/DOB/religion fields + immutable id rows. */
export function StudentIdentityCard({
  student,
  editable,
}: {
  student: Student
  editable: boolean
}) {
  const rows: CardRow[] = [
    { kind: "edit", name: "name_en", label: "Name (English)" },
    { kind: "edit", name: "name_bn", label: "Name (Bangla)" },
    { kind: "static", label: "Admission no", value: student.admission_no, mono: true },
    { kind: "edit", name: "birth_reg_no", label: "Birth registration no", mono: true },
    { kind: "edit", name: "date_of_birth", label: "Date of birth", type: "date" },
    { kind: "edit", name: "religion", label: "Religion" },
    { kind: "edit", name: "nationality", label: "Nationality" },
    { kind: "edit", name: "caste", label: "Caste" },
    {
      kind: "static",
      label: "Admitted",
      value: student.admitted_at ? formatDate(student.admitted_at) : null,
    },
  ]
  return (
    <InlineEditCard icon={User} title="Student" student={student} editable={editable} rows={rows} />
  )
}

/** Guardians card — father/mother names, NIDs, mobiles. */
export function StudentGuardiansCard({
  student,
  editable,
}: {
  student: Student
  editable: boolean
}) {
  const rows: CardRow[] = [
    { kind: "edit", name: "father_name_en", label: "Father (English)" },
    { kind: "edit", name: "father_name_bn", label: "Father (Bangla)" },
    { kind: "edit", name: "father_nid", label: "Father NID", mono: true },
    { kind: "edit", name: "father_mobile", label: "Father mobile", mono: true },
    { kind: "edit", name: "mother_name_en", label: "Mother (English)" },
    { kind: "edit", name: "mother_name_bn", label: "Mother (Bangla)" },
    { kind: "edit", name: "mother_nid", label: "Mother NID", mono: true },
    { kind: "edit", name: "mother_mobile", label: "Mother mobile", mono: true },
  ]
  return (
    <InlineEditCard icon={Users} title="Guardians" student={student} editable={editable} rows={rows} />
  )
}

/** Present address card. */
/**
 * The present/permanent address rows, used for the read-only view of the
 * combined address card. Field names match the mutable profile set.
 */
const PRESENT_ADDRESS_ROWS = [
  { name: "present_village", label: "Village / street" },
  { name: "present_post_office", label: "Post office" },
  { name: "present_upazila", label: "Upazila" },
  { name: "present_district", label: "District" },
  { name: "present_division", label: "Division" },
] as const

const PERMANENT_ADDRESS_ROWS = [
  { name: "permanent_village", label: "Village / street" },
  { name: "permanent_post_office", label: "Post office" },
  { name: "permanent_upazila", label: "Upazila" },
  { name: "permanent_district", label: "District" },
  { name: "permanent_division", label: "Division" },
] as const

/** True when every stored permanent address field equals its present counterpart. */
function permanentMatchesPresent(student: Student): boolean {
  return PERMANENT_ADDRESS_ROWS.every((r, i) => {
    const present = studentToInput(student)[PRESENT_ADDRESS_ROWS[i]!.name]
    const permanent = studentToInput(student)[r.name]
    return present !== "" && present === permanent
  })
}

/** Live present-address values shared between the present and permanent cards. */
interface PresentAddress {
  village: string
  post_office: string
  upazila: string
  district: string
  division: string
}

const AddressMirrorContext = React.createContext<{
  present: PresentAddress
  publishPresent: (value: PresentAddress) => void
} | null>(null)

function presentFromStudent(student: Student): PresentAddress {
  const i = studentToInput(student)
  return {
    village: i.present_village,
    post_office: i.present_post_office,
    upazila: i.present_upazila,
    district: i.present_district,
    division: i.present_division,
  }
}

/**
 * Renders the present + permanent address cards as two separate cards, wrapped
 * in a shared context that carries the *current* present address. The present
 * card publishes its live values while it's being edited, so the permanent
 * card's "same as present" checkbox mirrors the live present address (falling
 * back to the last-saved one when the present card isn't open). Renders no DOM
 * of its own, so both cards stay direct grid items on the detail page.
 */
export function StudentAddressCards({
  student,
  editable,
}: {
  student: Student
  editable: boolean
}) {
  const [present, setPresent] = React.useState<PresentAddress>(() =>
    presentFromStudent(student)
  )

  // Re-sync to the saved present address whenever it changes (e.g. after a save
  // refetch). Keyed on the value so live edits aren't clobbered mid-typing.
  const saved = presentFromStudent(student)
  const savedKey = `${saved.division}|${saved.district}|${saved.upazila}|${saved.post_office}|${saved.village}`
  React.useEffect(() => {
    setPresent(presentFromStudent(student))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey])

  const value = React.useMemo(
    () => ({ present, publishPresent: setPresent }),
    [present]
  )

  return (
    <AddressMirrorContext.Provider value={value}>
      <StudentPresentAddressCard student={student} editable={editable} />
      <StudentPermanentAddressCard student={student} editable={editable} />
    </AddressMirrorContext.Provider>
  )
}

const PRESENT_FIELD_NAMES = PRESENT_ADDRESS_ROWS.map((r) => r.name)
const PERMANENT_FIELD_NAMES = PERMANENT_ADDRESS_ROWS.map((r) => r.name)

const presentSchema = z.object({
  present_village: FIELD_SCHEMAS.present_village,
  present_post_office: FIELD_SCHEMAS.present_post_office,
  present_upazila: FIELD_SCHEMAS.present_upazila,
  present_district: FIELD_SCHEMAS.present_district,
  present_division: FIELD_SCHEMAS.present_division,
})
type PresentValues = z.infer<typeof presentSchema>

const permanentSchema = z.object({
  permanent_village: FIELD_SCHEMAS.permanent_village,
  permanent_post_office: FIELD_SCHEMAS.permanent_post_office,
  permanent_upazila: FIELD_SCHEMAS.permanent_upazila,
  permanent_district: FIELD_SCHEMAS.permanent_district,
  permanent_division: FIELD_SCHEMAS.permanent_division,
})
type PermanentValues = z.infer<typeof permanentSchema>

/** Pencil action shown in an address card header when editing is allowed. */
function CardEditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="size-8 rounded-lg text-copy-muted hover:text-copy-primary"
      aria-label={`Edit ${label}`}
    >
      <Pencil className="size-4" aria-hidden />
    </Button>
  )
}

/** Cancel / Save footer shared by the address cards. */
function CardFooter({ submitting, onCancel }: { submitting: boolean; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" size="sm" loading={submitting}>
        {submitting ? "Saving…" : "Save"}
      </Button>
    </div>
  )
}

/** Present address card — cascading dropdowns; publishes its live values. */
export function StudentPresentAddressCard({
  student,
  editable,
}: {
  student: Student
  editable: boolean
}) {
  const mirror = React.useContext(AddressMirrorContext)
  // The setter is stable (a useState setter), so depend on it directly — the
  // whole `mirror` object's identity changes on every publish, which would loop.
  const publishPresent = mirror?.publishPresent
  const update = useUpdateStudent()
  const [editing, setEditing] = React.useState(false)
  const [banner, setBanner] = React.useState<string | null>(null)

  const defaults = React.useMemo<PresentValues>(() => {
    const i = studentToInput(student)
    return {
      present_village: i.present_village,
      present_post_office: i.present_post_office,
      present_upazila: i.present_upazila,
      present_district: i.present_district,
      present_division: i.present_division,
    }
  }, [student])

  const form = useForm<PresentValues>({
    resolver: zodResolver(presentSchema),
    defaultValues: defaults,
  })

  // Publish the live present values while editing so the permanent card's
  // "same as present" can mirror them; restore the saved values on exit.
  const wDivision = form.watch("present_division")
  const wDistrict = form.watch("present_district")
  const wUpazila = form.watch("present_upazila")
  const wPostOffice = form.watch("present_post_office")
  const wVillage = form.watch("present_village")
  React.useEffect(() => {
    if (!publishPresent || !editing) return
    publishPresent({
      division: wDivision,
      district: wDistrict,
      upazila: wUpazila,
      post_office: wPostOffice,
      village: wVillage,
    })
  }, [publishPresent, editing, wDivision, wDistrict, wUpazila, wPostOffice, wVillage])

  function startEdit() {
    form.reset(defaults)
    setBanner(null)
    setEditing(true)
  }

  function cancel() {
    if (form.formState.isSubmitting) return
    setBanner(null)
    setEditing(false)
    mirror?.publishPresent(presentFromStudent(student))
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await update.mutateAsync({ id: student.id, ...buildPayload(student, values) })
      toastSuccess("Present address updated.", { id: "student-present-address" })
      setEditing(false)
    } catch (error) {
      if (isValidationError(error)) {
        if (applyFieldErrors(form, error, PRESENT_FIELD_NAMES)) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save changes.", { id: "student-present-address" })
    }
  })

  const submitting = form.formState.isSubmitting
  const input = studentToInput(student)

  return (
    <DetailCard
      icon={MapPin}
      title="Present address"
      action={editable && !editing ? <CardEditButton onClick={startEdit} label="present address" /> : null}
    >
      {editing ? (
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormBanner message={banner} />
            <AddressFieldset form={form} prefix="present" disabled={submitting} />
            <CardFooter submitting={submitting} onCancel={cancel} />
          </form>
        </Form>
      ) : (
        <div>
          {PRESENT_ADDRESS_ROWS.map((r) => (
            <DetailRow key={r.name} label={r.label} value={input[r.name] || null} />
          ))}
        </div>
      )}
    </DetailCard>
  )
}

/**
 * Permanent address card — cascading dropdowns plus a "Same as present" checkbox
 * that live-mirrors the present address (from the shared context) into the
 * permanent fields and locks them while ticked.
 */
export function StudentPermanentAddressCard({
  student,
  editable,
}: {
  student: Student
  editable: boolean
}) {
  const mirror = React.useContext(AddressMirrorContext)
  const update = useUpdateStudent()
  const [editing, setEditing] = React.useState(false)
  const [banner, setBanner] = React.useState<string | null>(null)
  const [sameAsPresent, setSameAsPresent] = React.useState(false)

  const defaults = React.useMemo<PermanentValues>(() => {
    const i = studentToInput(student)
    return {
      permanent_village: i.permanent_village,
      permanent_post_office: i.permanent_post_office,
      permanent_upazila: i.permanent_upazila,
      permanent_district: i.permanent_district,
      permanent_division: i.permanent_division,
    }
  }, [student])

  const form = useForm<PermanentValues>({
    resolver: zodResolver(permanentSchema),
    defaultValues: defaults,
  })

  // While ticked, mirror the present address (live, from context) → permanent.
  const present = mirror?.present
  React.useEffect(() => {
    if (!editing || !sameAsPresent || !present) return
    const opts = { shouldValidate: false, shouldDirty: true } as const
    form.setValue("permanent_division", present.division, opts)
    form.setValue("permanent_district", present.district, opts)
    form.setValue("permanent_upazila", present.upazila, opts)
    form.setValue("permanent_post_office", present.post_office, opts)
    form.setValue("permanent_village", present.village, opts)
  }, [
    form,
    editing,
    sameAsPresent,
    present?.division,
    present?.district,
    present?.upazila,
    present?.post_office,
    present?.village,
  ])

  function startEdit() {
    form.reset(defaults)
    setSameAsPresent(permanentMatchesPresent(student))
    setBanner(null)
    setEditing(true)
  }

  function cancel() {
    if (form.formState.isSubmitting) return
    setBanner(null)
    setEditing(false)
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      await update.mutateAsync({ id: student.id, ...buildPayload(student, values) })
      toastSuccess("Permanent address updated.", { id: "student-permanent-address" })
      setEditing(false)
    } catch (error) {
      if (isValidationError(error)) {
        if (applyFieldErrors(form, error, PERMANENT_FIELD_NAMES)) return
        setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save changes.", { id: "student-permanent-address" })
    }
  })

  const submitting = form.formState.isSubmitting
  const input = studentToInput(student)

  return (
    <DetailCard
      icon={MapPin}
      title="Permanent address"
      action={editable && !editing ? <CardEditButton onClick={startEdit} label="permanent address" /> : null}
    >
      {editing ? (
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <FormBanner message={banner} />
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-copy-secondary">
              <input
                type="checkbox"
                checked={sameAsPresent}
                onChange={(e) => setSameAsPresent(e.target.checked)}
                disabled={submitting}
                className="size-4 rounded border-surface-border accent-brand"
              />
              Same as present address
            </label>
            {sameAsPresent ? (
              <p className="text-sm text-copy-muted">
                Mirroring the present address. Untick to enter a different address.
              </p>
            ) : null}
            <AddressFieldset form={form} prefix="permanent" disabled={submitting || sameAsPresent} />
            <CardFooter submitting={submitting} onCancel={cancel} />
          </form>
        </Form>
      ) : (
        <div>
          {PERMANENT_ADDRESS_ROWS.map((r) => (
            <DetailRow key={r.name} label={r.label} value={input[r.name] || null} />
          ))}
        </div>
      )}
    </DetailCard>
  )
}
