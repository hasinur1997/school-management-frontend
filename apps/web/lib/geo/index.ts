/**
 * Bundled Bangladesh geographic dataset for cascading address selects (task 2.5).
 *
 * Source: aiFdn/Postcodes-of-Bangladesh, transformed into a nested
 * division → district → upazila (thana) → post office (+ postcode) tree and
 * patched to add the Mymensingh division (its districts split from Dhaka in
 * 2015). Names are the option values, so the address fields submit the chosen
 * label strings. Fully offline — no backend dependency.
 */

import raw from "./bd-locations.json"

export interface PostOffice {
  name: string
  /** 4-digit postcode, kept for reference/display. */
  code: string
}

export interface GeoUpazila {
  name: string
  post_offices: PostOffice[]
}

export interface GeoDistrict {
  name: string
  upazilas: GeoUpazila[]
}

export interface GeoDivision {
  name: string
  districts: GeoDistrict[]
}

const divisions = (raw as { divisions: GeoDivision[] }).divisions

/** All division names, alphabetically. */
export function getDivisions(): string[] {
  return divisions.map((d) => d.name)
}

/** Districts within a division (empty when the division is unknown/unset). */
export function getDistricts(division: string | null | undefined): string[] {
  if (!division) return []
  return divisions.find((d) => d.name === division)?.districts.map((d) => d.name) ?? []
}

/** Upazilas within a district. */
export function getUpazilas(
  division: string | null | undefined,
  district: string | null | undefined
): string[] {
  if (!division || !district) return []
  return (
    divisions
      .find((d) => d.name === division)
      ?.districts.find((d) => d.name === district)
      ?.upazilas.map((u) => u.name) ?? []
  )
}

/** Post offices within an upazila (with their postcodes). */
export function getPostOffices(
  division: string | null | undefined,
  district: string | null | undefined,
  upazila: string | null | undefined
): PostOffice[] {
  if (!division || !district || !upazila) return []
  return (
    divisions
      .find((d) => d.name === division)
      ?.districts.find((d) => d.name === district)
      ?.upazilas.find((u) => u.name === upazila)?.post_offices ?? []
  )
}
