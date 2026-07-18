"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Trash2 } from "lucide-react"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { CardSkeleton } from "@/components/skeletons"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { FormBanner } from "@/components/academic/management/form-helpers"
import { isValidationError } from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import type { GradingBand } from "@/types/settings"
import { useGradingScale } from "@/hooks/marks"
import { useUpdateGradingScale } from "@/hooks/settings"
import {
  SettingsPanelControls,
  SettingsPanelStatus,
  SettingsSectionCard,
} from "./settings-section-card"

const bandSchema = z.object({
  grade: z
    .string()
    .trim()
    .min(1, "Required")
    .max(5, "Max 5 characters"),
  min_marks: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number")
    .refine((value) => Number.parseInt(value, 10) <= 100, "Max 100"),
  max_marks: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number")
    .refine((value) => Number.parseInt(value, 10) <= 100, "Max 100"),
  grade_point: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid number")
    .refine((value) => Number.parseFloat(value) <= 9.99, "Max 9.99"),
  is_fail: z.boolean(),
})

const schema = z.object({
  scale: z.array(bandSchema).min(1, "Add at least one grade band"),
})

type GradingScaleValues = z.infer<typeof schema>

const EMPTY_BAND: GradingScaleValues["scale"][number] = {
  grade: "",
  min_marks: "",
  max_marks: "",
  grade_point: "",
  is_fail: false,
}

function toDefaults(scale: GradingBand[] | undefined): GradingScaleValues {
  if (!scale || scale.length === 0) {
    return { scale: [EMPTY_BAND] }
  }

  return {
    scale: scale.map((band) => ({
      grade: band.grade ?? "",
      min_marks:
        band.min_marks == null ? "" : String(Number(band.min_marks ?? 0)),
      max_marks:
        band.max_marks == null ? "" : String(Number(band.max_marks ?? 0)),
      grade_point:
        band.grade_point == null
          ? ""
          : String(Number(band.grade_point ?? 0)),
      is_fail: Boolean(band.is_fail),
    })),
  }
}

export function GradingScaleEditor({
  hideFooter = false,
  onStatusChange,
  onRegisterControls,
}: {
  hideFooter?: boolean
  onStatusChange?: (status: SettingsPanelStatus) => void
  onRegisterControls?: (controls: SettingsPanelControls | null) => void
}) {
  const scaleQuery = useGradingScale()
  const mutation = useUpdateGradingScale()
  const form = useForm<GradingScaleValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(undefined),
  })
  const [banner, setBanner] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "scale",
  })

  React.useEffect(() => {
    if (!scaleQuery.data) return
    form.reset(toDefaults(scaleQuery.data))
  }, [scaleQuery.data, form])

  const resetToServer = React.useCallback(() => {
    setBanner(null)
    form.reset(toDefaults(scaleQuery.data))
  }, [form, scaleQuery.data])

  React.useEffect(() => {
    if (scaleQuery.isPending || scaleQuery.isError || fields.length === 0) {
      onStatusChange?.({ dirty: false, submitting: false })
      return
    }

    onStatusChange?.({
      dirty: form.formState.isDirty,
      submitting: form.formState.isSubmitting,
    })
  }, [
    fields.length,
    form.formState.isDirty,
    form.formState.isSubmitting,
    onStatusChange,
    scaleQuery.isError,
    scaleQuery.isPending,
  ])

  React.useEffect(() => {
    onRegisterControls?.({
      submit: () => formRef.current?.requestSubmit(),
      reset: resetToServer,
    })
    return () => onRegisterControls?.(null)
  }, [onRegisterControls, resetToServer])

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    try {
      const next = await mutation.mutateAsync(
        values.scale.map((band) => ({
          grade: band.grade.trim(),
          min_marks: Number.parseInt(band.min_marks, 10),
          max_marks: Number.parseInt(band.max_marks, 10),
          grade_point: Number.parseFloat(band.grade_point),
          is_fail: band.is_fail,
        }))
      )
      form.reset(toDefaults(next))
      toastSuccess("Grading scale updated.", { id: "settings-grading-scale" })
    } catch (error) {
      if (isValidationError(error)) {
        let mapped = false
        for (const [index] of fields.entries()) {
          for (const key of [
            "grade",
            "min_marks",
            "max_marks",
            "grade_point",
            "is_fail",
          ] as const) {
            const message = error.first(`scale.${index}.${key}`)
            if (!message) continue
            form.setError(`scale.${index}.${key}` as const, { message }, {
              shouldFocus: !mapped,
            })
            mapped = true
          }
        }

        if (!mapped) {
          setBanner(error.first("scale") || error.message)
        }
        return
      }

      toastError(error, "Couldn't save the grading scale.", {
        id: "settings-grading-scale",
      })
    }
  })

  if (scaleQuery.isPending) {
    return <CardSkeleton className="min-h-[24rem]" />
  }

  if (scaleQuery.isError) {
    return (
      <SettingsSectionCard
        title="Grading scale"
        description="Edit the server-owned grade bands used when marks are saved."
      >
        <ErrorPanel
          description="We couldn't load the grading scale."
          onRetry={() => void scaleQuery.refetch()}
        />
      </SettingsSectionCard>
    )
  }

  if (fields.length === 0) {
    return (
      <SettingsSectionCard
        title="Grading scale"
        description="Edit the server-owned grade bands used when marks are saved."
      >
        <EmptyState
          title="No grading scale yet"
          description="Add at least one grade band to start building the scale."
          action={
            <Button type="button" onClick={() => append({ ...EMPTY_BAND })}>
              <Plus className="size-4" aria-hidden />
              Add band
            </Button>
          }
        />
      </SettingsSectionCard>
    )
  }

  return (
    <SettingsSectionCard
      title="Grading scale"
      description="Past published results keep their stored grade snapshots. Updating this scale only affects future saves."
      footer={hideFooter ? undefined : (
        <>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending || !form.formState.isDirty}
            onClick={resetToServer}
            className="h-[38px] rounded-[11px] border-[#e2e2e6] bg-white px-3.5 text-[13.5px] font-semibold text-[#1b1b1f] hover:bg-[#f4f4f5]"
          >
            Reset
          </Button>
          <Button
            type="submit"
            form="grading-scale-form"
            loading={mutation.isPending}
            disabled={!form.formState.isDirty}
            className="h-[38px] rounded-[11px] bg-[#7c3aed] px-4 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(124,58,237,0.28)] hover:bg-[#6d28d9]"
          >
            Save scale
          </Button>
        </>
      )}
    >
      <Form {...form}>
        <form
          ref={formRef}
          id="grading-scale-form"
          onSubmit={onSubmit}
          onReset={(event) => {
            event.preventDefault()
            resetToServer()
          }}
          className="space-y-5"
          noValidate
        >
          <FormBanner message={banner} />

          <div className="rounded-[12px] border border-[#ececef] bg-[#fafafa] px-4 py-3 text-[12.5px] text-[#71717a]">
            The API validates full 0–100 coverage, overlap / gap rules, exactly
            one failing grade, and descending grade points.
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[12.5px] text-[#9a9aa3]">
              Higher grades usually sit above lower grades, but the API is the
              final authority on the saved scale.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ ...EMPTY_BAND })}
              className="h-8 rounded-[9px] border-[#e2e2e6] bg-white px-3 text-[12.5px] font-semibold text-[#1b1b1f] hover:bg-[#f4f4f5]"
            >
              <Plus className="size-4" aria-hidden />
              Add band
            </Button>
          </div>

          <div className="overflow-x-auto rounded-[12px] border border-[#ececef]">
            <table className="min-w-[760px] divide-y divide-[#ececef]">
              <thead className="bg-[#fafafa] text-left text-[11.5px] font-semibold tracking-[0.07em] text-[#9a9aa3] uppercase">
                <tr>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Min</th>
                  <th className="px-4 py-3">Max</th>
                  <th className="px-4 py-3">Point</th>
                  <th className="px-4 py-3">Fail</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ececef] bg-white">
                {fields.map((row, index) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3">
                      <FormField
                        control={form.control}
                        name={`scale.${index}.grade`}
                        render={({ field }) => (
                          <FormItem className="gap-1.5">
                            <FormControl>
                              <Input
                                {...field}
                                disabled={form.formState.isSubmitting}
                                className="h-10 rounded-[10px] border-[#e2e2e6] bg-white px-3 text-[14px] text-[#1b1b1f] focus-visible:border-[#c9b3f5] focus-visible:ring-3 focus-visible:ring-[#f3effe]"
                                autoComplete="off"
                                placeholder="A+"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <FormField
                        control={form.control}
                        name={`scale.${index}.min_marks`}
                        render={({ field }) => (
                          <FormItem className="gap-1.5">
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value}
                                disabled={form.formState.isSubmitting}
                                className="h-10 rounded-[10px] border-[#e2e2e6] bg-white px-3 text-[14px] text-[#1b1b1f] focus-visible:border-[#c9b3f5] focus-visible:ring-3 focus-visible:ring-[#f3effe]"
                                inputMode="numeric"
                                min={0}
                                max={100}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <FormField
                        control={form.control}
                        name={`scale.${index}.max_marks`}
                        render={({ field }) => (
                          <FormItem className="gap-1.5">
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value}
                                disabled={form.formState.isSubmitting}
                                className="h-10 rounded-[10px] border-[#e2e2e6] bg-white px-3 text-[14px] text-[#1b1b1f] focus-visible:border-[#c9b3f5] focus-visible:ring-3 focus-visible:ring-[#f3effe]"
                                inputMode="numeric"
                                min={0}
                                max={100}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <FormField
                        control={form.control}
                        name={`scale.${index}.grade_point`}
                        render={({ field }) => (
                          <FormItem className="gap-1.5">
                            <FormControl>
                              <Input
                                type="number"
                                value={field.value}
                                disabled={form.formState.isSubmitting}
                                className="h-10 rounded-[10px] border-[#e2e2e6] bg-white px-3 text-[14px] text-[#1b1b1f] focus-visible:border-[#c9b3f5] focus-visible:ring-3 focus-visible:ring-[#f3effe]"
                                inputMode="decimal"
                                min={0}
                                max={9.99}
                                step="0.01"
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <FormField
                        control={form.control}
                        name={`scale.${index}.is_fail`}
                        render={({ field }) => (
                          <FormItem className="gap-1.5">
                            <label className="flex min-h-10 items-center gap-2 rounded-[10px] border border-[#e2e2e6] px-3 py-2 text-[13px] font-medium text-[#1b1b1f]">
                              <input
                                type="checkbox"
                                checked={field.value}
                                disabled={form.formState.isSubmitting}
                                onChange={(event) =>
                                  field.onChange(event.target.checked)
                                }
                                className="size-4 rounded border-[#d4d4d8] accent-[#7c3aed]"
                              />
                              Failing grade
                            </label>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={form.formState.isSubmitting || fields.length === 1}
                        onClick={() => remove(index)}
                        className="text-[#c2410c] hover:bg-[#fff2e8] hover:text-[#c2410c]"
                      >
                        <Trash2 className="size-4" aria-hidden />
                        <span className="sr-only">Remove row {index + 1}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      </Form>
    </SettingsSectionCard>
  )
}
