"use client"

/**
 * Admission review detail (task 2.6): the full submitted application — identity,
 * guardian, address, previous education, photo, and documents — plus the approve
 * and reject actions for a still-pending application. Reads `useAdmission`;
 * approve/reject invalidate the cache so the view (and the queue) refresh. Owns
 * loading / not-found / error / loaded states; an out-of-branch or missing
 * record surfaces as not-found. Manage actions are gated by `admissions.manage`.
 */

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Check, Download, FileText, User, X } from "lucide-react"

import { Button, buttonVariants } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { DetailSkeleton } from "@/components/skeletons"
import { isNotFoundError } from "@/lib/api"
import { cn } from "@workspace/ui/lib/utils"
import { formatDate } from "@/lib/format"
import { useAdmission } from "@/hooks/admissions"
import {
  admissionApplicantName,
  documentLabel,
  documentUrl,
  isPendingAdmission,
  statusClassName,
  type Admission,
} from "@/types/admission"
import { ADMISSION_MANAGE } from "./permissions"
import { admissionStatusLabel, admissionStatusTone } from "./admission-tone"
import { resolveMediaUrl } from "./media"
import { ApproveDialog } from "./approve-dialog"
import { RejectDialog } from "./reject-dialog"

const EMPTY = "—"

export function AdmissionDetail({ id }: { id: string }) {
  const { data: admission, isPending, isError, error, refetch } = useAdmission(id)

  const [approveOpen, setApproveOpen] = React.useState(false)
  const [rejectOpen, setRejectOpen] = React.useState(false)

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <DetailSkeleton />
      </div>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <div className="flex flex-col gap-6">
          <BackLink />
          <EmptyState
            title="Application not found"
            description="This application doesn't exist or isn't in your branch."
            action={
              <Link href="/admissions" className={cn(buttonVariants())}>
                Back to admissions
              </Link>
            }
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <ErrorPanel
          description="We couldn't load this application."
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const name = admissionApplicantName(admission)
  const photo = resolveMediaUrl(admission.photo_url)
  const documents = admission.documents ?? []
  const education = admission.previous_educations ?? []
  const pending = isPendingAdmission(admission.status)

  return (
    <div className="flex flex-col gap-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className="size-28 shrink-0 rounded-lg border border-surface-border object-cover"
            />
          ) : (
            <div className="flex size-28 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-base/40 text-copy-muted">
              <User className="size-10" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-copy-primary">
                {name}
              </h1>
              <StatusBadge
                status={admission.status}
                tone={admissionStatusTone(admission.status)}
                label={admissionStatusLabel(admission.status)}
              />
            </div>
            {admission.name_bn ? (
              <p className="truncate text-sm text-copy-secondary">
                {admission.name_bn}
              </p>
            ) : null}
            <p className="truncate font-mono text-xs text-copy-muted">
              {admission.application_no}
            </p>
            {statusClassName(admission) ? (
              <p className="truncate text-xs text-copy-muted">
                {statusClassName(admission)}
              </p>
            ) : null}
          </div>
        </div>

        {pending ? (
          <Can permission={ADMISSION_MANAGE}>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(true)}>
                <X className="size-4" aria-hidden />
                Reject
              </Button>
              <Button onClick={() => setApproveOpen(true)}>
                <Check className="size-4" aria-hidden />
                Approve
              </Button>
            </div>
          </Can>
        ) : null}
      </div>

      {/* Rejection reason, if any */}
      {admission.rejection_reason ? (
        <section className="rounded-xl border border-error/20 bg-error/10 p-4 text-sm text-error">
          <p className="font-medium">Rejection reason</p>
          <p className="mt-1">{admission.rejection_reason}</p>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Student */}
        <Section title="Student">
          <Field label="Name (English)" value={admission.name_en} />
          <Field label="Name (Bangla)" value={admission.name_bn} />
          <Field
            label="Date of birth"
            value={
              admission.date_of_birth ? formatDate(admission.date_of_birth) : null
            }
          />
          <Field label="Birth registration no." value={admission.birth_reg_no} />
          <Field label="Religion" value={admission.religion} />
          <Field label="Nationality" value={admission.nationality} />
          <Field label="Caste" value={admission.caste} />
        </Section>

        {/* Admission */}
        <Section title="Admission">
          <Field label="Application no." value={admission.application_no} />
          <Field label="Desired class" value={statusClassName(admission)} />
          <Field
            label="Submitted"
            value={
              admission.submitted_at ? formatDate(admission.submitted_at) : null
            }
          />
          <Field
            label="Reviewed"
            value={
              admission.reviewed_at ? formatDate(admission.reviewed_at) : null
            }
          />
          <Field label="Reviewed by" value={admission.reviewed_by?.name} />
        </Section>

        {/* Guardian */}
        <Section title="Guardian">
          <Field label="Father (English)" value={admission.father_name_en} />
          <Field label="Father (Bangla)" value={admission.father_name_bn} />
          <Field label="Father NID" value={admission.father_nid} />
          <Field label="Father mobile" value={admission.father_mobile} />
          <Field label="Mother (English)" value={admission.mother_name_en} />
          <Field label="Mother (Bangla)" value={admission.mother_name_bn} />
          <Field label="Mother NID" value={admission.mother_nid} />
          <Field label="Mother mobile" value={admission.mother_mobile} />
        </Section>

        {/* Address */}
        <Section title="Address">
          <Field label="Present" value={presentAddress(admission)} />
          <Field label="Permanent" value={permanentAddress(admission)} />
        </Section>
      </div>

      {/* Previous education */}
      <Section title="Previous education" fullWidth>
        {education.length === 0 ? (
          <EmptyState
            title="No previous education"
            description="The applicant didn't provide prior education details."
            className="border-0 bg-transparent py-6"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {education.map((row, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-surface-border bg-base/40 px-3 py-2 text-sm"
              >
                <span className="font-medium text-copy-primary">
                  {row.exam_name || `Exam ${i + 1}`}
                </span>
                {row.institution_name ? (
                  <span className="text-copy-secondary">
                    · {row.institution_name}
                  </span>
                ) : null}
                {row.passing_year ? (
                  <span className="text-copy-muted">· {row.passing_year}</span>
                ) : null}
                {row.gpa ? (
                  <StatusBadge status="GPA" tone="info" label={`GPA ${row.gpa}`} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Documents */}
      <Section title="Documents" fullWidth>
        {documents.length === 0 ? (
          <EmptyState
            title="No documents"
            description="No supporting documents were uploaded."
            className="border-0 bg-transparent py-6"
          />
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {documents.map((doc, i) => {
              const href = resolveMediaUrl(documentUrl(doc))
              const label = documentLabel(doc, i)
              return (
                <li key={i}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-surface-border bg-base/40 px-3 py-2.5 text-sm transition-colors hover:bg-base"
                    >
                      <FileText
                        className="size-4 shrink-0 text-copy-muted"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-copy-primary">
                        {label}
                      </span>
                      <Download
                        className="size-4 shrink-0 text-copy-muted"
                        aria-hidden
                      />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-surface-border bg-base/40 px-3 py-2.5 text-sm text-copy-muted">
                      <FileText className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        admission={admission}
      />
      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        admission={admission}
      />
    </div>
  )
}

function presentAddress(a: Admission): string | null {
  return joinAddress([
    a.present_village,
    a.present_post_office,
    a.present_upazila,
    a.present_district,
    a.present_division,
  ])
}

function permanentAddress(a: Admission): string | null {
  return joinAddress([
    a.permanent_village,
    a.permanent_post_office,
    a.permanent_upazila,
    a.permanent_district,
    a.permanent_division,
  ])
}

function joinAddress(parts: (string | null | undefined)[]): string | null {
  const joined = parts
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p))
    .join(", ")
  return joined || null
}

function BackLink() {
  return (
    <Link
      href="/admissions"
      className="inline-flex w-fit items-center gap-1.5 text-sm text-copy-muted hover:text-copy-primary"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back to admissions
    </Link>
  )
}

function Section({
  title,
  children,
  fullWidth,
}: {
  title: string
  children: React.ReactNode
  fullWidth?: boolean
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-surface-border bg-surface p-4 sm:p-6",
        fullWidth ? "col-span-full" : ""
      )}
    >
      <h2 className="text-base font-semibold text-copy-primary">{title}</h2>
      {fullWidth ? (
        children
      ) : (
        <dl className="flex flex-col divide-y divide-surface-border">
          {children}
        </dl>
      )}
    </section>
  )
}

function Field({
  label,
  value,
  className,
}: {
  label: string
  value?: string | null
  className?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-copy-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right text-sm text-copy-secondary",
          className
        )}
      >
        {value || EMPTY}
      </dd>
    </div>
  )
}
