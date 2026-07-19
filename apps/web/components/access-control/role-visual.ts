/**
 * Presentation metadata for roles on the access-control screen — the coloured
 * dot / badge palette and friendly copy that mirror the imported "Access
 * Control" design. The **roles themselves always come from `GET /roles`**; this
 * only decorates the ones the API returns (an unknown role falls back to a
 * neutral swatch and no description — never invented).
 */

import { humanizeSlug } from "@/types/access-control"

export interface RoleVisual {
  /** Solid dot / accent colour. */
  dot: string
  /** Soft ring behind the dot. */
  dotRing: string
  /** Pill badge background / border / foreground. */
  badgeBg: string
  badgeBorder: string
  badgeFg: string
}

/** Design-matched swatches keyed by seeded role name. */
const ROLE_VISUALS: Record<string, RoleVisual> = {
  super_admin: {
    dot: "#7c3aed",
    dotRing: "#f3effe",
    badgeBg: "#f3effe",
    badgeBorder: "#e7defb",
    badgeFg: "#7c3aed",
  },
  admin: {
    dot: "#2563eb",
    dotRing: "#e8effe",
    badgeBg: "#e8effe",
    badgeBorder: "#d3e0fc",
    badgeFg: "#2563eb",
  },
  accountant: {
    dot: "#15803d",
    dotRing: "#e9f8ee",
    badgeBg: "#e9f8ee",
    badgeBorder: "#cdeed7",
    badgeFg: "#15803d",
  },
  teacher: {
    dot: "#71717a",
    dotRing: "#f1f1f2",
    badgeBg: "#f4f4f5",
    badgeBorder: "#ececef",
    badgeFg: "#71717a",
  },
  reception: {
    dot: "#c2410c",
    dotRing: "#fff2e8",
    badgeBg: "#fff2e8",
    badgeBorder: "#fbdcc4",
    badgeFg: "#c2410c",
  },
  student: {
    dot: "#c2410c",
    dotRing: "#fff2e8",
    badgeBg: "#fff2e8",
    badgeBorder: "#fbdcc4",
    badgeFg: "#c2410c",
  },
  parent: {
    dot: "#0e7490",
    dotRing: "#e5f6fa",
    badgeBg: "#e5f6fa",
    badgeBorder: "#cbeaf1",
    badgeFg: "#0e7490",
  },
}

const NEUTRAL_VISUAL: RoleVisual = {
  dot: "#71717a",
  dotRing: "#f1f1f2",
  badgeBg: "#f4f4f5",
  badgeBorder: "#ececef",
  badgeFg: "#71717a",
}

export function roleVisual(name: string): RoleVisual {
  return ROLE_VISUALS[name] ?? NEUTRAL_VISUAL
}

/** Friendly copy for the seeded roles; empty for anything unrecognised. */
const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Full, unrestricted access to every part of the system.",
  admin: "Runs the school day to day — students, academics, fees and documents.",
  accountant: "Handles fees, invoices, receipts, expenses and finance reports.",
  teacher: "Takes attendance and enters marks for their own classes.",
  student: "Sees only their own profile, results, attendance and fees.",
  parent: "Sees their linked children's records — read-only.",
}

export function roleDescription(name: string): string {
  return ROLE_DESCRIPTIONS[name] ?? ""
}

/** Slug → display label, e.g. `super_admin` → "Super admin". */
export function roleLabel(name: string): string {
  return humanizeSlug(name)
}
