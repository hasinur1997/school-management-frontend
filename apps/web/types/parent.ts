/**
 * Parent/guardian domain types (task 2.8).
 *
 * Backend contract (`~/Herd/app-api` ParentController/ParentResource):
 * parents are admin-created accounts (`parent.manage`) with a many-to-many
 * student link. Parent ids and linked student ids are public ids in responses;
 * the API resolves `student_id` request fields from public ids.
 */

import type { StudentStatusValue } from "./student"

export type ParentRelation = "father" | "mother" | "guardian"

export interface LinkedStudent {
  id: string
  name_en: string | null
  class: string | null
  section: string | null
  photo_url: string | null
  /**
   * Present on the parent's linked-students listing (`/me/students`) so the
   * "Students" table can mirror the admin students list columns. Older/compact
   * payloads may omit these, so they're optional.
   */
  admission_no?: string | null
  name_bn?: string | null
  roll_no?: string | number | null
  status?: StudentStatusValue
}

export interface ParentProfile {
  id: string
  name: string
  phone: string
  email: string | null
  relation: ParentRelation
  students?: LinkedStudent[]
  deleted_at?: string | null
}

export interface ParentListParams {
  search?: string
  page?: number
  per_page?: number
}

export interface ParentCreateInput {
  name: string
  phone: string
  email?: string | null
  relation: ParentRelation
  student_ids: string[]
}

export interface ParentLinkStudentInput {
  parentId: string
  studentId: string
}

export function parentRelationLabel(relation: ParentRelation): string {
  if (relation === "father") return "Father"
  if (relation === "mother") return "Mother"
  return "Guardian"
}

export function linkedStudentLabel(student: LinkedStudent): string {
  return student.name_en || `Student ${student.id}`
}

export function linkedStudentMeta(student: LinkedStudent): string {
  return (
    [student.class, student.section].filter(Boolean).join(" · ") ||
    "No current class"
  )
}
