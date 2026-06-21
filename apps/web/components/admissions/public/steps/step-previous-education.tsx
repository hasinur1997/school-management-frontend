"use client"

/**
 * Step 5 — Previous Education (optional). One empty row is shown by default and
 * is not required to fill; visitors can add or remove rows. A row that is filled
 * requires its exam + institution names (enforced by the schema). Task 2.5.
 */

import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/button"
import { TextField } from "../fields"
import { emptyPreviousEducation, type AdmissionFormValues } from "../schema"

export function StepPreviousEducation({ form }: { form: UseFormReturn<AdmissionFormValues> }) {
  const { control } = form
  const { fields, append, remove } = useFieldArray({ control, name: "previous_educations" })

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-copy-muted">
        Optional — add any previous exams. Leave blank if not applicable.
      </p>

      <ul className="flex flex-col gap-4">
        {fields.map((row, index) => (
          <li
            key={row.id}
            className="rounded-xl border border-surface-border bg-base/40 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-copy-secondary">
                Education #{index + 1}
              </span>
              {fields.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  aria-label={`Remove education ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name={`previous_educations.${index}.exam_name`}
                label="Exam name"
              />
              <TextField
                control={control}
                name={`previous_educations.${index}.institution_name`}
                label="Institution name"
              />
              <TextField
                control={control}
                name={`previous_educations.${index}.gpa`}
                label="GPA (0–5)"
                inputMode="decimal"
              />
              <TextField
                control={control}
                name={`previous_educations.${index}.passing_year`}
                label="Passing year"
                inputMode="numeric"
              />
              <TextField
                control={control}
                name={`previous_educations.${index}.board_roll`}
                label="Board roll"
              />
              <TextField
                control={control}
                name={`previous_educations.${index}.board_reg_no`}
                label="Board reg. no."
              />
            </div>
          </li>
        ))}
      </ul>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ ...emptyPreviousEducation })}
        >
          <Plus className="size-4" aria-hidden />
          Add another
        </Button>
      </div>
    </div>
  )
}
