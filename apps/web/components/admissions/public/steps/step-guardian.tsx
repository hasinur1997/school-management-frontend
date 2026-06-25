"use client"

/**
 * Step 3 — Guardian Info. Father's mobile is required; NIDs and mother's mobile
 * are optional. Task 2.5.
 */

import type { UseFormReturn } from "react-hook-form"

import { SectionLegend, TextField } from "../fields"
import type { AdmissionFormValues } from "../schema"

export function StepGuardian({ form }: { form: UseFormReturn<AdmissionFormValues> }) {
  const { control } = form
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <SectionLegend>Father</SectionLegend>
        <div className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
          <TextField control={control} name="father_name_bn" label="Name (Bangla)" required />
          <TextField control={control} name="father_name_en" label="Name (English)" required />
          <TextField control={control} name="father_nid" label="NID (optional)" />
          <TextField
            control={control}
            name="father_mobile"
            label="Mobile"
            required
            type="tel"
            inputMode="tel"
          />
          <TextField
            control={control}
            name="father_email"
            label="Email (optional)"
            type="email"
            inputMode="email"
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <SectionLegend>Mother</SectionLegend>
        <div className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
          <TextField control={control} name="mother_name_bn" label="Name (Bangla)" required />
          <TextField control={control} name="mother_name_en" label="Name (English)" required />
          <TextField control={control} name="mother_nid" label="NID (optional)" />
          <TextField
            control={control}
            name="mother_mobile"
            label="Mobile (optional)"
            type="tel"
            inputMode="tel"
          />
          <TextField
            control={control}
            name="mother_email"
            label="Email (optional)"
            type="email"
            inputMode="email"
          />
        </div>
      </fieldset>
    </div>
  )
}
