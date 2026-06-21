"use client"

/**
 * Step 7 — Preview. A read-only summary of the application, laid out to the
 * Admission form design handoff: a navy header banner, a branch summary + photo
 * head row, then sectioned key/value cards (Student, Guardian, addresses,
 * Education). Driven entirely by the live form values, so "Edit" (handled by the
 * wizard) returns to step 1 with everything retained. The downloadable PDF is
 * produced from the submitted snapshot on the confirmation screen. Task 2.5.
 */

import * as React from "react"
import type { UseFormReturn } from "react-hook-form"

import type { PublicSettings } from "@/types/admission"
import type { AdmissionFormValues } from "../schema"

export interface StepPreviewProps {
  form: UseFormReturn<AdmissionFormValues>
  settings: PublicSettings
}

/** Empty/absent values render as an em dash, matching the design. */
function val(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—"
  return String(value)
}

interface Row {
  k: string
  v: string
}

/** A key/value section card (uppercase accent header + 2-col rows). */
function SectionCard({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <div className="border-b border-surface-border bg-base/60 px-4.5 py-2.75 text-xs font-bold uppercase tracking-wider text-brand">
        {title}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {rows.map((r, i) => (
          <div
            key={`${r.k}-${i}`}
            className="flex justify-between gap-3.5 border-b border-surface-border/70 px-4.5 py-2.75 text-sm"
          >
            <span className="text-copy-muted">{r.k}</span>
            <span className="text-right font-semibold text-copy-primary">{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StepPreview({ form, settings }: StepPreviewProps) {
  const v = form.getValues()

  const branch = (settings.branches ?? []).find((b) => b.id === v.branch_id)
  const branchName = branch?.name ?? `Branch #${v.branch_id}`
  const className =
    (branch?.classes ?? []).find((c) => c.id === v.desired_class_id)?.name ??
    `Class #${v.desired_class_id}`
  const schoolName = settings.school_name ?? branchName
  const session = String(new Date().getFullYear())

  // Object URL for the photo thumbnail — created and revoked in one effect so the
  // exact URL is the one revoked (StrictMode-safe).
  const photo = v.photo
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!photo) {
      setPhotoUrl(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPhotoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const headRows: Row[] = [
    { k: "Branch", v: val(branchName) },
    { k: "Class", v: val(className) },
    { k: "Session", v: session },
  ]

  const filledEducations = (v.previous_educations ?? []).filter(
    (e) => e.exam_name || e.institution_name
  )

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Student",
      rows: [
        { k: "Name (Bangla)", v: val(v.name_bn) },
        { k: "Name (English)", v: val(v.name_en) },
        { k: "Date of birth", v: val(v.date_of_birth) },
        { k: "Birth reg. no.", v: val(v.birth_reg_no) },
        { k: "Religion", v: val(v.religion) },
        { k: "Nationality", v: val(v.nationality) },
        { k: "Caste", v: val(v.caste) },
      ],
    },
    {
      title: "Guardian",
      rows: [
        { k: "Father (English)", v: val(v.father_name_en) },
        { k: "Father mobile", v: val(v.father_mobile) },
        { k: "Father NID", v: val(v.father_nid) },
        { k: "Mother (English)", v: val(v.mother_name_en) },
        { k: "Mother mobile", v: val(v.mother_mobile) },
        { k: "Mother NID", v: val(v.mother_nid) },
      ],
    },
    {
      title: "Present address",
      rows: [
        { k: "Village / street", v: val(v.present_village) },
        { k: "Post office", v: val(v.present_post_office) },
        { k: "Upazila", v: val(v.present_upazila) },
        { k: "District", v: val(v.present_district) },
      ],
    },
    {
      title: "Permanent address",
      rows: [
        { k: "Village / street", v: val(v.permanent_village) },
        { k: "Post office", v: val(v.permanent_post_office) },
        { k: "Upazila", v: val(v.permanent_upazila) },
        { k: "District", v: val(v.permanent_district) },
      ],
    },
  ]

  if (filledEducations.length > 0) {
    sections.push({
      title: "Education",
      rows: filledEducations.flatMap((e, i) => {
        const n = filledEducations.length > 1 ? ` #${i + 1}` : ""
        return [
          { k: `Exam${n}`, v: val(e.exam_name) },
          { k: `Institution${n}`, v: val(e.institution_name) },
          { k: `GPA${n}`, v: val(e.gpa) },
          { k: `Passing year${n}`, v: val(e.passing_year) },
        ]
      }),
    })
  }

  const documentNames = (v.documents ?? []).map((f) => f.name)

  return (
    <div className="flex flex-col gap-5.5">
      {/* Navy header banner */}
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-[#13294b] px-7 py-6">
        <div className="flex items-center gap-4.5">
          <span className="flex size-13.5 flex-none items-center justify-center rounded-xl border border-white/25 bg-white/10 text-2xl font-extrabold text-white">
            {schoolName.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9fb6d6]">
              {schoolName}
            </div>
            <div className="mt-0.5 text-2xl font-extrabold leading-tight tracking-tight text-white">
              Admission Application
            </div>
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#9fb6d6]">
            Application No.
          </div>
          <div className="mt-0.5 text-xl font-bold text-white">Pending</div>
          <span className="mt-2 inline-block rounded-md bg-brand px-3 py-1 text-xs font-bold text-white">
            {className}
          </span>
        </div>
      </div>

      {/* Head row: branch summary + applicant photo */}
      <div className="flex flex-wrap items-stretch gap-5.5">
        <div className="min-w-70 flex-1 overflow-hidden rounded-xl border border-surface-border">
          <div className="h-1 bg-brand" />
          {headRows.map((r) => (
            <div
              key={r.k}
              className="flex justify-between gap-3.5 border-b border-surface-border/70 px-4.5 py-3.25 text-sm"
            >
              <span className="text-copy-muted">{r.k}</span>
              <span className="text-right font-semibold text-copy-primary">{r.v}</span>
            </div>
          ))}
        </div>
        <div className="w-38 flex-none rounded-2xl border-[1.5px] border-surface-border bg-surface p-2.25 shadow-sm">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Applicant photo"
              className="block h-42 w-full rounded-[9px] object-cover"
            />
          ) : (
            <div className="flex h-42 w-full items-center justify-center rounded-[9px] bg-base text-xs text-copy-muted">
              No photo
            </div>
          )}
        </div>
      </div>

      {/* Remaining sections */}
      {sections.map((s) => (
        <SectionCard key={s.title} title={s.title} rows={s.rows} />
      ))}

      {documentNames.length > 0 ? (
        <SectionCard
          title="Documents"
          rows={documentNames.map((name, i) => ({ k: `File #${i + 1}`, v: name }))}
        />
      ) : null}
    </div>
  )
}
