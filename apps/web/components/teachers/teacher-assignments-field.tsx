"use client"

/**
 * Repeatable class/subject assignment editor used inside the teacher create/edit
 * form (task 2.4). Each row pairs a required class with an optional section and
 * subject (shared 2.1 selectors, scoped to the row's class); an absent subject
 * marks a class-teacher row, a present one a subject-teacher row. Rows can be
 * added and removed. The parent form (RHF) owns the field array; this component
 * is the controlled view over it.
 */

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/button"
import { ClassSelect, SectionSelect, SubjectSelect } from "@/components/academic"
import type { TeacherAssignmentInput } from "@/types/teacher"

export interface TeacherAssignmentsFieldProps {
  value: TeacherAssignmentInput[]
  onChange: (value: TeacherAssignmentInput[]) => void
  disabled?: boolean
}

const EMPTY_ROW: TeacherAssignmentInput = {
  class_id: 0,
  section_id: null,
  subject_id: null,
}

export function TeacherAssignmentsField({
  value,
  onChange,
  disabled,
}: TeacherAssignmentsFieldProps) {
  function update(index: number, patch: Partial<TeacherAssignmentInput>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    onChange([...value, { ...EMPTY_ROW }])
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <p className="rounded-md border border-dashed border-surface-border px-3 py-4 text-center text-sm text-copy-muted">
          No assignments yet. Add a class to assign this teacher.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {value.map((row, index) => {
            const classId = row.class_id > 0 ? row.class_id : null
            return (
              <li
                key={index}
                className="rounded-lg border border-surface-border bg-base/40 p-3"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-copy-muted">
                      Class
                    </span>
                    <ClassSelect
                      value={classId}
                      onValueChange={(next) =>
                        update(index, {
                          class_id: next ?? 0,
                          // Section/subject are scoped to the class — reset them.
                          section_id: null,
                          subject_id: null,
                        })
                      }
                      disabled={disabled}
                      aria-label={`Class for assignment ${index + 1}`}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-copy-muted">
                      Section
                    </span>
                    <SectionSelect
                      classId={classId}
                      value={row.section_id ?? null}
                      onValueChange={(next) =>
                        update(index, { section_id: next })
                      }
                      disabled={disabled}
                      aria-label={`Section for assignment ${index + 1}`}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-copy-muted">
                      Subject
                    </span>
                    <SubjectSelect
                      classId={classId}
                      value={row.subject_id ?? null}
                      onValueChange={(next) =>
                        update(index, { subject_id: next })
                      }
                      disabled={disabled}
                      aria-label={`Subject for assignment ${index + 1}`}
                    />
                  </label>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={addRow}
        >
          <Plus className="size-4" aria-hidden />
          Add assignment
        </Button>
      </div>
    </div>
  )
}
