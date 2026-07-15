/**
 * Deterministic avatar visuals for a branch — initials + a stable accent color
 * drawn from a fixed palette. Mirrors the imported "Branch Switcher" design's
 * `initials()` and color palette so the same branch always renders the same
 * badge across the switcher, popup, create modal, and login picker.
 *
 * The color is keyed off the branch's opaque `public_id` (a stable string), so
 * it stays consistent regardless of list order or how many branches exist.
 */

/** The design's ten-color accent palette (index-mapped). */
export const BRANCH_PALETTE = [
  "#7c3aed",
  "#0f766e",
  "#b45309",
  "#be185d",
  "#1d4ed8",
  "#15803d",
  "#c2410c",
  "#4338ca",
  "#a21caf",
  "#0e7490",
] as const

/** Up-to-two-letter uppercase initials from a branch name (design's `initials`). */
export function branchInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}

/** A stable hash of a string → non-negative integer (djb2). */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return hash >>> 0
}

/** A stable accent color for a branch, keyed off its id. */
export function branchColor(id: string): string {
  return BRANCH_PALETTE[hashString(id) % BRANCH_PALETTE.length]!
}
