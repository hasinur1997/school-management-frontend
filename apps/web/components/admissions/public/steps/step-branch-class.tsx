"use client"

/**
 * Step 1 — Branch & Class. Branch and class come from `GET /public/settings`;
 * the class list is filtered to the chosen branch and reset whenever the branch
 * changes (the desired class must belong to the selected branch). Task 2.5.
 */

import * as React from "react"
import type { UseFormReturn } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { AcademicSelect } from "@/components/academic"
import type { PublicSettings } from "@/types/admission"
import { Req } from "../fields"
import type { AdmissionFormValues } from "../schema"

export interface StepBranchClassProps {
  form: UseFormReturn<AdmissionFormValues>
  settings: PublicSettings
}

export function StepBranchClass({ form, settings }: StepBranchClassProps) {
  const branchId = form.watch("branch_id")

  const branchOptions = React.useMemo(
    () => (settings.branches ?? []).map((b) => ({ value: b.id, label: b.name })),
    [settings.branches]
  )

  // Classes are nested under their branch; show only the selected branch's.
  const classOptions = React.useMemo(() => {
    const branch = (settings.branches ?? []).find((b) => b.id === branchId)
    return (branch?.classes ?? []).map((c) => ({ value: c.id, label: c.name }))
  }, [settings.branches, branchId])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="branch_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Branch
              <Req />
            </FormLabel>
            <FormControl>
              <AcademicSelect
                value={(field.value as number | null) ?? null}
                onValueChange={(next) => {
                  field.onChange(next)
                  // The desired class must belong to the selected branch — reset it.
                  form.setValue("desired_class_id", null as unknown as number, {
                    shouldValidate: false,
                  })
                }}
                options={branchOptions}
                placeholder="Select a branch"
                emptyPlaceholder="No branches available"
                aria-label="Branch"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="desired_class_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Class applying for
              <Req />
            </FormLabel>
            <FormControl>
              <AcademicSelect
                value={(field.value as number | null) ?? null}
                onValueChange={(next) => field.onChange(next)}
                options={classOptions}
                placeholder="Select a class"
                disabled={branchId == null}
                disabledPlaceholder="Select a branch first"
                emptyPlaceholder="No classes for this branch"
                aria-label="Class applying for"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
