"use client"

/**
 * Cascading address block — Division → District → Upazila → Post office (bundled
 * BD dataset, shared `LocationSelect` + `lib/geo`) plus a free-text village /
 * street. Each select is disabled until its parent level is chosen and resets
 * the levels below it on change; the post office shows its postcode. Mirrors the
 * admission `StepAddress` fieldset, but generic over any RHF form that carries
 * the standard `{prefix}_division / _district / _upazila / _post_office /
 * _village` string fields, so the student create / edit / inline-card surfaces
 * all share one implementation.
 */

import * as React from "react"
import type { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { LocationSelect } from "@/components/admissions/public/location-select"
import {
  getDistricts,
  getDivisions,
  getPostOffices,
  getUpazilas,
} from "@/lib/geo"

export interface AddressFieldsetProps<T extends FieldValues> {
  form: UseFormReturn<T>
  prefix: "present" | "permanent"
  disabled?: boolean
}

export function AddressFieldset<T extends FieldValues>({
  form,
  prefix,
  disabled = false,
}: AddressFieldsetProps<T>) {
  const divisionName = `${prefix}_division` as Path<T>
  const districtName = `${prefix}_district` as Path<T>
  const upazilaName = `${prefix}_upazila` as Path<T>
  const postOfficeName = `${prefix}_post_office` as Path<T>
  const villageName = `${prefix}_village` as Path<T>

  const division = (form.watch(divisionName) as string | undefined) ?? ""
  const district = (form.watch(districtName) as string | undefined) ?? ""
  const upazila = (form.watch(upazilaName) as string | undefined) ?? ""
  const postOffice = (form.watch(postOfficeName) as string | undefined) ?? ""

  const districts = React.useMemo(() => getDistricts(division), [division])
  const upazilas = React.useMemo(() => getUpazilas(division, district), [division, district])
  const postOffices = React.useMemo(
    () => getPostOffices(division, district, upazila),
    [division, district, upazila]
  )
  const postcode = postOffices.find((p) => p.name === postOffice)?.code ?? null

  function set(name: Path<T>, value: string) {
    form.setValue(name, value as PathValue<T, Path<T>>, {
      shouldValidate: false,
      shouldDirty: true,
    })
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <FormField
        control={form.control}
        name={divisionName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Division</FormLabel>
            <FormControl>
              <LocationSelect
                value={(field.value as string) || null}
                onValueChange={(next) => {
                  field.onChange(next ?? "")
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
            <FormLabel>District</FormLabel>
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
            <FormLabel>Upazila / Thana</FormLabel>
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
            <FormLabel>Post office</FormLabel>
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
        <FormField
          control={form.control}
          name={villageName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Village / street / house</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string | undefined) ?? ""}
                  disabled={disabled}
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
