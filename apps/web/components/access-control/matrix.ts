/**
 * Projects the seeded permission registry onto the imported design's exact
 * capability matrix — the fixed **View / Create / Edit / Delete** columns.
 *
 * The backend permissions are `module.verb` with richer verbs than CRUD
 * (`manage`, `approve`, `entry`, `generate`, `collect`, `issue`, `execute`,
 * `override`, …). Each verb maps to one of the four design columns; a cell can
 * hold **more than one** permission (so nothing is ever dropped from the grid),
 * and the checkbox toggles every permission in that cell together. With the
 * current registry every cell holds at most one permission, so it behaves like
 * the design's one-checkbox-per-cell grid — the array form only future-proofs
 * against a new verb colliding into an occupied cell.
 *
 * Real permission names are surfaced as the cell's tooltip so the CRUD relabel
 * is never misleading.
 */

import { humanizeSlug, permissionVerb, type PermissionGroup } from "@/types/access-control"

export type Capability = "view" | "create" | "edit" | "delete"

/** The four design columns, in order. */
export const CAPABILITIES: { key: Capability; label: string }[] = [
  { key: "view", label: "View" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
]

/** Map a permission verb to its design column. Unknown verbs fall to Edit so a
 *  new permission is always shown and toggleable (never silently dropped). */
function verbCapability(verb: string): Capability {
  switch (verb) {
    case "view":
      return "view"
    case "create":
    case "entry":
    case "generate":
    case "issue":
    case "execute":
    case "collect":
      return "create"
    case "delete":
      return "delete"
    case "update":
    case "edit":
    case "manage":
    case "approve":
    case "override":
    default:
      return "edit"
  }
}

/** Friendly, static module descriptions for the matrix rows (presentation copy
 *  only — the modules themselves come from the API). */
const MODULE_DESCRIPTIONS: Record<string, string> = {
  branch: "School branches and their setup",
  session: "Academic sessions",
  class: "Classes and sections",
  subject: "Subjects taught",
  teacher: "Teacher profiles and records",
  admission: "New enrollment and transfers",
  student: "Student profiles and records",
  parent: "Guardian accounts and links",
  attendance: "Daily class attendance",
  teacher_attendance: "Staff check-in and attendance",
  exam: "Exam setup and scheduling",
  marks: "Marks entry and review",
  result: "Results and mark sheets",
  promotion: "Class promotion",
  fee: "Fee structures and collection",
  invoice: "Invoices",
  income: "Income ledger",
  expense: "Expenses and vouchers",
  asset: "Assets register",
  idcard: "Student ID cards",
  tc: "Transfer certificates",
  report: "Financial and academic reports",
  setting: "School configuration",
  role: "Roles and access control",
}

export interface MatrixCell {
  capability: Capability
  /** Real permission names this cell toggles (usually one). */
  permissions: string[]
  /** Whether the module exposes any permission for this column. */
  applicable: boolean
}

export interface MatrixRow {
  module: string
  name: string
  desc: string
  cells: MatrixCell[]
}

/** Build the design matrix (one row per module, four cells per row). */
export function buildMatrix(groups: PermissionGroup[]): MatrixRow[] {
  return groups.map((group) => {
    const byCapability: Record<Capability, string[]> = {
      view: [],
      create: [],
      edit: [],
      delete: [],
    }
    for (const perm of group.permissions) {
      byCapability[verbCapability(permissionVerb(perm.name))].push(perm.name)
    }
    return {
      module: group.module,
      name: humanizeSlug(group.module),
      desc: MODULE_DESCRIPTIONS[group.module] ?? "",
      cells: CAPABILITIES.map(({ key }) => ({
        capability: key,
        permissions: byCapability[key],
        applicable: byCapability[key].length > 0,
      })),
    }
  })
}
