"use client"

/**
 * Step 4 — Address (task 2.5). Present and Permanent address, each a cascading
 * Division → District → Upazila → Post office set (bundled BD dataset) plus a
 * free-text village/street. A "Same as present" checkbox mirrors the present
 * address into the permanent one (and keeps it in sync while ticked).
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
import {
  getDistricts,
  getDivisions,
  getPostOffices,
  getUpazilas,
} from "@/lib/geo"
import { Req, SectionLegend, TextField } from "../fields"
import { LocationSelect } from "../location-select"
import type { AdmissionFormValues } from "../schema"

type Prefix = "present" | "permanent"

/** One cascading address block (the four selects + the village/street field). */
function AddressFieldset({
  form,
  prefix,
  disabled = false,
}: {
  form: UseFormReturn<AdmissionFormValues>
  prefix: Prefix
  disabled?: boolean
}) {
  const divisionName = `${prefix}_division` as const
  const districtName = `${prefix}_district` as const
  const upazilaName = `${prefix}_upazila` as const
  const postOfficeName = `${prefix}_post_office` as const

  const division = form.watch(divisionName)
  const district = form.watch(districtName)
  const upazila = form.watch(upazilaName)
  const postOffice = form.watch(postOfficeName)

  const districts = React.useMemo(() => getDistricts(division), [division])
  const upazilas = React.useMemo(() => getUpazilas(division, district), [division, district])
  const postOffices = React.useMemo(
    () => getPostOffices(division, district, upazila),
    [division, district, upazila]
  )
  const postcode = postOffices.find((p) => p.name === postOffice)?.code ?? null

  function set(name: keyof AdmissionFormValues, value: string) {
    form.setValue(name, value, { shouldValidate: false, shouldDirty: true })
  }

  return (
    <div className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
      <FormField
        control={form.control}
        name={divisionName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Division
              <Req />
            </FormLabel>
            <FormControl>
              <LocationSelect
                value={(field.value as string) || null}
                onValueChange={(next) => {
                  field.onChange(next ?? "")
                  // Reset dependents below this level.
                  set(districtName, "")
                  set(upazilaName, "")
                  set(postOfficeName, "")
                }}
                options={getDivisions()}
                placeholder="Select division"
                disabled={disabled}
                aria-label={`${prefix} division`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={districtName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              District
              <Req />
            </FormLabel>
            <FormControl>
              <LocationSelect
                value={(field.value as string) || null}
                onValueChange={(next) => {
                  field.onChange(next ?? "")
                  set(upazilaName, "")
                  set(postOfficeName, "")
                }}
                options={districts}
                placeholder="Select district"
                disabled={disabled || !division}
                disabledPlaceholder="Select a division first"
                aria-label={`${prefix} district`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={upazilaName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Upazila / Thana
              <Req />
            </FormLabel>
            <FormControl>
              <LocationSelect
                value={(field.value as string) || null}
                onValueChange={(next) => {
                  field.onChange(next ?? "")
                  set(postOfficeName, "")
                }}
                options={upazilas}
                placeholder="Select upazila"
                disabled={disabled || !district}
                disabledPlaceholder="Select a district first"
                aria-label={`${prefix} upazila`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={postOfficeName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Post office
              <Req />
            </FormLabel>
            <FormControl>
              <LocationSelect
                value={(field.value as string) || null}
                onValueChange={(next) => field.onChange(next ?? "")}
                options={postOffices.map((p) => p.name)}
                placeholder="Select post office"
                disabled={disabled || !upazila}
                disabledPlaceholder="Select an upazila first"
                aria-label={`${prefix} post office`}
              />
            </FormControl>
            {postcode ? (
              <p className="text-xs text-copy-muted">Postcode: {postcode}</p>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="sm:col-span-2">
        <TextField
          control={form.control}
          name={`${prefix}_village`}
          label="Village / street / house"
          required
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export function StepAddress({ form }: { form: UseFormReturn<AdmissionFormValues> }) {
  const sameAsPresent = form.watch("permanent_same_as_present")
  const presentDivision = form.watch("present_division")
  const presentDistrict = form.watch("present_district")
  const presentUpazila = form.watch("present_upazila")
  const presentPostOffice = form.watch("present_post_office")
  const presentVillage = form.watch("present_village")

  // While "same as present" is ticked, keep the permanent address mirrored to
  // the present one (including later edits to the present fields).
  React.useEffect(() => {
    if (!sameAsPresent) return
    const opts = { shouldValidate: false, shouldDirty: true } as const
    form.setValue("permanent_division", presentDivision, opts)
    form.setValue("permanent_district", presentDistrict, opts)
    form.setValue("permanent_upazila", presentUpazila, opts)
    form.setValue("permanent_post_office", presentPostOffice, opts)
    form.setValue("permanent_village", presentVillage, opts)
  }, [
    form,
    sameAsPresent,
    presentDivision,
    presentDistrict,
    presentUpazila,
    presentPostOffice,
    presentVillage,
  ])

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <SectionLegend>Present address</SectionLegend>
        <AddressFieldset form={form} prefix="present" />
      </fieldset>

      <FormField
        control={form.control}
        name="permanent_same_as_present"
        render={({ field }) => (
          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-copy-secondary">
            <input
              type="checkbox"
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="size-4 rounded border-surface-border accent-brand"
            />
            Permanent address is the same as present
          </label>
        )}
      />

      <fieldset className="flex flex-col gap-4">
        <SectionLegend>Permanent address</SectionLegend>
        {sameAsPresent ? (
          <p className="text-sm text-copy-muted">
            Same as present address. Untick the box above to enter a different address.
          </p>
        ) : null}
        <AddressFieldset form={form} prefix="permanent" disabled={sameAsPresent} />
      </fieldset>
    </div>
  )
}
