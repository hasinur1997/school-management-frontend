/**
 * Build the multipart `FormData` body for `POST /public/admissions` (task 2.5).
 *
 * Only documented fields are submitted; empty optional fields are omitted, empty
 * previous-education rows are dropped, and files are appended last. Array fields
 * use Laravel's bracket notation (`previous_educations[0][exam_name]`,
 * `documents[]`). No auth token or `branch_id` is involved.
 */

import type { AdmissionFormValues } from "./schema"

/** Scalar text fields, in submission order. Required ones are always sent. */
const TEXT_FIELDS: Array<keyof AdmissionFormValues> = [
  "name_bn",
  "name_en",
  "date_of_birth",
  "birth_reg_no",
  "religion",
  "nationality",
  "caste",
  "father_name_bn",
  "father_name_en",
  "father_nid",
  "father_mobile",
  "mother_name_bn",
  "mother_name_en",
  "mother_nid",
  "mother_mobile",
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
]

export function buildAdmissionFormData(values: AdmissionFormValues): FormData {
  const form = new FormData()

  if (values.branch_id != null) form.append("branch_id", String(values.branch_id))
  if (values.desired_class_id != null) {
    form.append("desired_class_id", String(values.desired_class_id))
  }

  for (const key of TEXT_FIELDS) {
    const value = values[key]
    if (typeof value === "string" && value.trim() !== "") {
      form.append(key, value.trim())
    }
  }

  // Previous education: only rows that carry the required pair.
  values.previous_educations
    .filter((row) => row.exam_name.trim() && row.institution_name.trim())
    .forEach((row, i) => {
      const prefix = `previous_educations[${i}]`
      form.append(`${prefix}[exam_name]`, row.exam_name.trim())
      form.append(`${prefix}[institution_name]`, row.institution_name.trim())
      if (row.gpa.trim()) form.append(`${prefix}[gpa]`, row.gpa.trim())
      if (row.passing_year.trim()) form.append(`${prefix}[passing_year]`, row.passing_year.trim())
      if (row.board_roll.trim()) form.append(`${prefix}[board_roll]`, row.board_roll.trim())
      if (row.board_reg_no.trim()) form.append(`${prefix}[board_reg_no]`, row.board_reg_no.trim())
    })

  if (values.photo) form.append("photo", values.photo)
  values.documents.forEach((file) => form.append("documents[]", file))

  return form
}
