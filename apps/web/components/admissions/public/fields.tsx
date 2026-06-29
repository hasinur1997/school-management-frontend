"use client"

/**
 * Tiny shared form bits for the admission wizard (task 2.5): the required-field
 * asterisk and a labelled text `FormField` wrapper so each step stays terse
 * while every input still renders its own `FormMessage` (`code-standards.md`,
 * Forms).
 */

import type { Control, FieldPath } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { DatePicker } from "@workspace/ui/components/date-picker"

import type { AdmissionFormValues } from "./schema"

/**
 * Uppercase accent sub-group heading inside a step (e.g. "Father", "Present
 * address") — the design's section-divider treatment. Renders a `<legend>`, so
 * use it as the first child of a `<fieldset>`.
 */
export function SectionLegend({ children }: { children: string }) {
  return (
    <legend className="text-xs font-bold uppercase tracking-wider text-brand">
      {children}
    </legend>
  )
}

/** Red `*` shown next to required field labels (`ui-context.md`). */
export function Req() {
  return (
    <span className="text-error" aria-hidden>
      {" "}
      *
    </span>
  )
}

export interface TextFieldProps {
  control: Control<AdmissionFormValues>
  name: FieldPath<AdmissionFormValues>
  label: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  autoComplete?: string
  /** Extra classes on the field wrapper — e.g. `sm:col-span-2` to span the grid. */
  className?: string
}

/** A single labelled text input wired through RHF `FormField`. */
export function TextField({
  control,
  name,
  label,
  required = false,
  disabled = false,
  placeholder,
  type = "text",
  inputMode,
  autoComplete = "off",
  className,
}: TextFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required ? <Req /> : null}
          </FormLabel>
          <FormControl>
            {type === "date" ? (
              <DatePicker
                value={(field.value as string) ?? ""}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                disabled={disabled}
                placeholder={placeholder ?? label}
                captionLayout="dropdown"
                startMonth={new Date(1950, 0)}
                endMonth={new Date()}
                disabledDates={{ after: new Date() }}
              />
            ) : (
              <Input
                {...field}
                value={(field.value as string) ?? ""}
                type={type}
                inputMode={inputMode}
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
