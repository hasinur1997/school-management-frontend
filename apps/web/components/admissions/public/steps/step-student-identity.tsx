"use client"

/**
 * Step 2 — Student Identity. Nationality is locked to "Bangladeshi" (disabled);
 * a duplicate `birth_reg_no` surfaces here as an inline `422` ("already
 * registered") mapped by the wizard. Task 2.5.
 */

import type { UseFormReturn } from "react-hook-form"

import { TextField } from "../fields"
import type { AdmissionFormValues } from "../schema"

export function StepStudentIdentity({ form }: { form: UseFormReturn<AdmissionFormValues> }) {
  const { control } = form
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextField control={control} name="name_bn" label="Name (Bangla)" required />
      <TextField control={control} name="name_en" label="Name (English)" required />
      <TextField
        control={control}
        name="date_of_birth"
        label="Date of birth"
        type="date"
        required
      />
      <TextField
        control={control}
        name="birth_reg_no"
        label="Birth registration no."
        required
      />
      <TextField control={control} name="religion" label="Religion" required />
      <TextField
        control={control}
        name="nationality"
        label="Nationality"
        disabled
      />
      <TextField control={control} name="caste" label="Caste (optional)" />
    </div>
  )
}
