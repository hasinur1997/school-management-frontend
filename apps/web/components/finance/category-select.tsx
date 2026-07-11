"use client"

/**
 * `CategorySelect` — income/expense category dropdown backed by `useCategories`
 * and cached via TanStack Query (task F-5.6). Controlled; surfaces
 * loading/empty/error states through the shared `AcademicSelect`.
 *
 * `type` filters the list to income- or expense-type categories so the income
 * and expense forms (5.4) and the asset form (5.5) each see only the relevant
 * categories. Consumed as a reusable component so a category added in the 5.6
 * manager appears everywhere it's used.
 */

import {
  AcademicSelect,
  type AcademicSelectProps,
} from "@/components/academic/academic-select"
import { useCategories } from "@/hooks/finance"
import type { CategoryType } from "@/types/finance"

type CategorySelectProps = Pick<
  AcademicSelectProps<string>,
  | "value"
  | "onValueChange"
  | "disabled"
  | "id"
  | "className"
  | "clearLabel"
  | "aria-label"
  | "aria-describedby"
  | "aria-invalid"
> & {
  /** Restrict options to this category type (income vs expense). */
  type?: CategoryType
  placeholder?: string
}

export function CategorySelect({
  type,
  placeholder = "Select category",
  ...props
}: CategorySelectProps) {
  const { data, isLoading, isError } = useCategories(type)

  const options = (data ?? []).map((category) => ({
    value: category.id,
    label: category.name,
  }))

  return (
    <AcademicSelect
      {...props}
      options={options}
      isLoading={isLoading}
      isError={isError}
      placeholder={placeholder}
      emptyPlaceholder="No categories"
    />
  )
}
