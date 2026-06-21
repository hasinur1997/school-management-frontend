/**
 * Zod schema + step model for the public admission wizard (task 2.5).
 *
 * One schema validates the whole application; the wizard validates a step at a
 * time by `trigger`-ing only that step's fields (`STEP_FIELDS`). Client rules
 * mirror the ticket's Field Specification but are never authoritative — the API
 * re-validates and a `422` is mapped back onto the matching field/step.
 */

import { z } from "zod"

const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_DOC_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_DOCS = 5
const PHOTO_TYPES = ["image/jpeg", "image/png"]
const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"]

const required = (max: number, label = "This field is required") =>
  z.string().trim().min(1, label).max(max, `Keep this to ${max} characters or fewer.`)

const optional = (max: number) =>
  z.string().trim().max(max, `Keep this to ${max} characters or fewer.`)

/** A previous-education row: optional, but if any cell is filled the two name
 * fields become required and the numeric fields must be well-formed. */
const previousEducationSchema = z
  .object({
    exam_name: z.string().trim().max(100, "Keep this to 100 characters or fewer."),
    institution_name: z.string().trim().max(150, "Keep this to 150 characters or fewer."),
    gpa: z.string().trim(),
    passing_year: z.string().trim(),
    board_roll: z.string().trim().max(30, "Keep this to 30 characters or fewer."),
    board_reg_no: z.string().trim().max(30, "Keep this to 30 characters or fewer."),
  })
  .superRefine((row, ctx) => {
    const filled = Object.values(row).some((v) => v.trim() !== "")
    if (!filled) return // empty row is allowed

    if (!row.exam_name.trim()) {
      ctx.addIssue({ path: ["exam_name"], code: z.ZodIssueCode.custom, message: "Exam name is required." })
    }
    if (!row.institution_name.trim()) {
      ctx.addIssue({
        path: ["institution_name"],
        code: z.ZodIssueCode.custom,
        message: "Institution name is required.",
      })
    }
    if (row.gpa.trim()) {
      const gpa = Number(row.gpa)
      if (!Number.isFinite(gpa) || gpa < 0 || gpa > 5) {
        ctx.addIssue({ path: ["gpa"], code: z.ZodIssueCode.custom, message: "GPA must be between 0 and 5." })
      }
    }
    if (row.passing_year.trim() && !/^\d{4}$/.test(row.passing_year.trim())) {
      ctx.addIssue({
        path: ["passing_year"],
        code: z.ZodIssueCode.custom,
        message: "Enter a 4-digit year.",
      })
    }
  })

export const admissionSchema = z.object({
  // Step 1 — branch & class
  branch_id: z.number({ error: "Select a branch." }).int().positive("Select a branch."),
  desired_class_id: z.number({ error: "Select a class." }).int().positive("Select a class."),

  // Step 2 — student identity
  name_bn: required(150, "Name (Bangla) is required."),
  name_en: required(150, "Name (English) is required."),
  date_of_birth: required(10, "Date of birth is required.").refine(
    (v) => !Number.isNaN(new Date(v).getTime()),
    "Enter a valid date."
  ),
  birth_reg_no: required(25, "Birth registration number is required."),
  religion: required(50, "Religion is required."),
  nationality: optional(50), // locked default "Bangladeshi"
  caste: optional(50),

  // Step 3 — guardian info
  father_name_bn: required(150, "Father's name (Bangla) is required."),
  father_name_en: required(150, "Father's name (English) is required."),
  father_nid: optional(20),
  father_mobile: required(20, "Father's mobile is required."),
  mother_name_bn: required(150, "Mother's name (Bangla) is required."),
  mother_name_en: required(150, "Mother's name (English) is required."),
  mother_nid: optional(20),
  mother_mobile: optional(20),

  // Step 4 — present address (cascading division → district → upazila → post office)
  present_division: required(100, "Division is required."),
  present_district: required(100, "District is required."),
  present_upazila: required(100, "Upazila is required."),
  present_post_office: required(100, "Post office is required."),
  present_village: required(100, "Village / street is required."),
  // permanent address — `same_as_present` mirrors the present address when on
  permanent_same_as_present: z.boolean(),
  permanent_division: required(100, "Division is required."),
  permanent_district: required(100, "District is required."),
  permanent_upazila: required(100, "Upazila is required."),
  permanent_post_office: required(100, "Post office is required."),
  permanent_village: required(100, "Village / street is required."),

  // Step 5 — previous education (optional)
  previous_educations: z.array(previousEducationSchema),

  // Step 6 — photo & documents
  photo: z
    .custom<File | null>((v) => v instanceof File, "A photo is required.")
    .refine((f) => f instanceof File && PHOTO_TYPES.includes(f.type), "Photo must be a JPG or PNG.")
    .refine((f) => f instanceof File && f.size <= MAX_PHOTO_BYTES, "Photo must be 2MB or smaller."),
  documents: z
    .array(z.custom<File>((v) => v instanceof File))
    .max(MAX_DOCS, `Attach at most ${MAX_DOCS} documents.`)
    .superRefine((files, ctx) => {
      files.forEach((file, i) => {
        if (!DOC_TYPES.includes(file.type)) {
          ctx.addIssue({ path: [i], code: z.ZodIssueCode.custom, message: "Documents must be PDF, JPG, or PNG." })
        }
        if (file.size > MAX_DOC_BYTES) {
          ctx.addIssue({ path: [i], code: z.ZodIssueCode.custom, message: "Each document must be 5MB or smaller." })
        }
      })
    }),
})

export type AdmissionFormValues = z.infer<typeof admissionSchema>

/** A fresh previous-education row (the wizard shows one by default). */
export const emptyPreviousEducation: AdmissionFormValues["previous_educations"][number] = {
  exam_name: "",
  institution_name: "",
  gpa: "",
  passing_year: "",
  board_roll: "",
  board_reg_no: "",
}

export const defaultValues: AdmissionFormValues = {
  branch_id: null as unknown as number,
  desired_class_id: null as unknown as number,
  name_bn: "",
  name_en: "",
  date_of_birth: "",
  birth_reg_no: "",
  religion: "",
  nationality: "Bangladeshi",
  caste: "",
  father_name_bn: "",
  father_name_en: "",
  father_nid: "",
  father_mobile: "",
  mother_name_bn: "",
  mother_name_en: "",
  mother_nid: "",
  mother_mobile: "",
  present_division: "",
  present_district: "",
  present_upazila: "",
  present_post_office: "",
  present_village: "",
  permanent_same_as_present: false,
  permanent_division: "",
  permanent_district: "",
  permanent_upazila: "",
  permanent_post_office: "",
  permanent_village: "",
  previous_educations: [{ ...emptyPreviousEducation }],
  photo: null,
  documents: [],
}

/** Wizard steps in order. Indices line up with `STEP_FIELDS`. */
export const STEPS = [
  { key: "branch-class", label: "Branch & Class" },
  { key: "identity", label: "Student" },
  { key: "guardian", label: "Guardian" },
  { key: "address", label: "Address" },
  { key: "education", label: "Education" },
  { key: "documents", label: "Documents" },
  { key: "preview", label: "Preview" },
] as const

export type StepKey = (typeof STEPS)[number]["key"]

/** Fields validated when advancing past each step (`trigger`). */
export const STEP_FIELDS: Array<Array<keyof AdmissionFormValues>> = [
  ["branch_id", "desired_class_id"],
  ["name_bn", "name_en", "date_of_birth", "birth_reg_no", "religion", "nationality", "caste"],
  [
    "father_name_bn",
    "father_name_en",
    "father_nid",
    "father_mobile",
    "mother_name_bn",
    "mother_name_en",
    "mother_nid",
    "mother_mobile",
  ],
  [
    "present_division",
    "present_district",
    "present_upazila",
    "present_post_office",
    "present_village",
    "permanent_division",
    "permanent_district",
    "permanent_upazila",
    "permanent_post_office",
    "permanent_village",
  ],
  ["previous_educations"],
  ["photo", "documents"],
  [], // preview — nothing to validate
]

/**
 * Given a field name, find the wizard step that owns it (so a `422` or a failed
 * client validation can jump to the first step containing an error). Nested keys
 * like `previous_educations.0.exam_name` and `documents.0` resolve via the
 * field's root segment. Returns `-1` when no step owns the field — callers must
 * not silently jump to step 0, but surface the message instead.
 */
export function stepForField(field: string): number {
  const root = field.split(".")[0] as keyof AdmissionFormValues
  return STEP_FIELDS.findIndex((fields) => fields.includes(root))
}

/** Lowest step index that owns any of the given fields, or `null` if none do. */
export function firstStepWithError(fields: string[]): number | null {
  let first: number | null = null
  for (const field of fields) {
    const step = stepForField(field)
    if (step !== -1 && (first === null || step < first)) first = step
  }
  return first
}
