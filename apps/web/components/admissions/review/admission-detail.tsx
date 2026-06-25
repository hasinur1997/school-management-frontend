"use client"

/**
 * Admission review detail (task 2.6): the full submitted application — identity,
 * guardian, address, previous education, photo, and documents — plus the approve
 * and reject actions for a still-pending application. Reads `useAdmission`;
 * approve/reject invalidate the cache so the view (and the queue) refresh. Owns
 * loading / not-found / error / loaded states; an out-of-branch or missing
 * record surfaces as not-found. Manage actions are gated by `admissions.manage`.
 *
 * Layout mirrors the "Admission Detail" design canvas: a status-accented hero
 * (avatar, name, status pill, key-facts strip) over a two-column grid of
 * icon-headed info cards, then previous education and documents.
 */

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  BookmarkCheck,
  Check,
  Download,
  FileText,
  GraduationCap,
  ImageOff,
  MapPin,
  User,
  Users,
  X,
} from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import { Button } from "@/components/button"
import { Can } from "@/components/auth/can"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
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
import { resolveMediaUrl } from "./media"
import { ApproveDialog } from "./approve-dialog"
import { RejectDialog } from "./reject-dialog"

const EMPTY = "—"

/**
 * Status accent for the hero. Mirrors the design's pending/approved/rejected
 * palette (soft pill, avatar ring, and top accent bar) with dark-mode variants,
 * so the page tracks the active theme.
 */
type StatusKey = "pending" | "approved" | "rejected"

const STATUS_ACCENT: Record<
  StatusKey,
  { label: string; pill: string; ring: string; bar: string }
> = {
  pending: {
    label: "Pending review",
    pill: "bg-[#fffbeb] text-[#b45309] border-[#fce7ad] dark:bg-[#2a2008] dark:text-[#fbbf24] dark:border-[#3b2c0a]",
    ring: "ring-[#fcd34d] dark:ring-[#7c5e10]",
    bar: "linear-gradient(90deg,#f59e0b,#fbbf24)",
  },
  approved: {
    label: "Approved",
    pill: "bg-[#edfcf3] text-[#047857] border-[#a7f3cf] dark:bg-[#05281e] dark:text-[#34d399] dark:border-[#0a4534]",
    ring: "ring-[#6ee7b7] dark:ring-[#0f6149]",
    bar: "linear-gradient(90deg,#059669,#34d399)",
  },
  rejected: {
    label: "Rejected",
    pill: "bg-[#fef2f2] text-[#dc2626] border-[#fecaca] dark:bg-[#2a0e0e] dark:text-[#f87171] dark:border-[#481717]",
    ring: "ring-[#fca5a5] dark:ring-[#7f2727]",
    bar: "linear-gradient(90deg,#dc2626,#f87171)",
  },
}

function statusKeyOf(status: string): StatusKey {
  const value = status.trim().toLowerCase()
  if (value === "approved") return "approved"
  if (value === "rejected") return "rejected"
  return "pending"
}

export function AdmissionDetail({ id }: { id: string }) {
  const { data: admission, isPending, isError, error, refetch } = useAdmission(id)

  const [approveOpen, setApproveOpen] = React.useState(false)
  const [rejectOpen, setRejectOpen] = React.useState(false)

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-[1080px]">
        <BackLink />
        <DetailSkeleton />
      </div>
    )
  }

  if (isError) {
    if (isNotFoundError(error)) {
      return (
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
          <BackLink />
          <EmptyState
            title="Application not found"
            description="This application doesn't exist or isn't in your branch."
            action={
              <Link href="/admissions">
                <Button>Back to admissions</Button>
              </Link>
            }
          />
        </div>
      )
    }
    return (
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6">
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
  const decided = !pending
  const accent = STATUS_ACCENT[statusKeyOf(admission.status)]

  const present = presentAddress(admission)
  const permanent = permanentAddress(admission)
  const sameAddress = Boolean(present && permanent && present === permanent)

  return (
    <div className="mx-auto w-full max-w-[1080px]">
      <BackLink />

      {/* HERO */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-surface-border bg-surface px-6 py-6 shadow-lg">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: accent.bar }}
          aria-hidden
        />
        <div className="flex flex-col gap-5 pt-1.5 sm:flex-row sm:items-start sm:gap-5">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              className={cn(
                "size-[76px] shrink-0 rounded-2xl object-cover ring-[3px] ring-offset-[3px] ring-offset-surface",
                accent.ring
              )}
            />
          ) : (
            <div
              className={cn(
                "grid size-[76px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 text-2xl font-semibold text-white ring-[3px] ring-offset-[3px] ring-offset-surface",
                accent.ring
              )}
            >
              {initials(name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-copy-primary">
                {name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  accent.pill
                )}
              >
                <span
                  className="size-1.5 rounded-full bg-current"
                  aria-hidden
                />
                {accent.label}
              </span>
            </div>
            {admission.name_bn ? (
              <div className="mt-1 text-[15px] text-copy-secondary">
                {admission.name_bn}
              </div>
            ) : null}
          </div>

          {pending ? (
            <Can permission={ADMISSION_MANAGE}>
              <div className="flex shrink-0 items-center gap-2.5">
                <Button
                  variant="outline"
                  className="h-10 gap-[7px] rounded-[10px] px-4 text-sm font-semibold hover:border-error/30 hover:bg-error/10 hover:text-error"
                  onClick={() => setRejectOpen(true)}
                >
                  <X className="size-4" strokeWidth={2.2} aria-hidden />
                  Reject
                </Button>
                <Button
                  className="h-10 gap-[7px] rounded-[10px] px-[18px] text-sm font-semibold"
                  onClick={() => setApproveOpen(true)}
                >
                  <Check className="size-4" strokeWidth={2.4} aria-hidden />
                  Approve
                </Button>
              </div>
            </Can>
          ) : null}
        </div>

        {/* key facts strip */}
        <div className="mt-5 grid grid-cols-2 gap-y-4 border-t border-surface-border-subtle pt-[18px] sm:grid-cols-4 sm:gap-y-0 sm:divide-x sm:divide-surface-border-subtle">
          <KeyFact label="Application no." value={admission.application_no} mono />
          <KeyFact label="Desired class" value={statusClassName(admission)} />
          <KeyFact
            label="Date of birth"
            value={admission.date_of_birth ? formatDate(admission.date_of_birth) : null}
          />
          <KeyFact
            label="Submitted"
            value={admission.submitted_at ? formatDate(admission.submitted_at) : null}
          />
        </div>
      </div>

      {/* Rejection reason, if any */}
      {admission.rejection_reason ? (
        <section className="mb-5 rounded-2xl border border-error/20 bg-error/10 p-4 text-sm text-error">
          <p className="font-semibold">Rejection reason</p>
          <p className="mt-1">{admission.rejection_reason}</p>
        </section>
      ) : null}

      {/* INFO GRID */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Student */}
        <InfoCard icon={User} title="Student">
          <Row label="Name (English)" value={admission.name_en} />
          <Row label="Name (Bangla)" value={admission.name_bn} />
          <Row
            label="Date of birth"
            value={admission.date_of_birth ? formatDate(admission.date_of_birth) : null}
          />
          <Row label="Birth registration no." value={admission.birth_reg_no} mono />
          <Row label="Religion" value={admission.religion} />
          <Row label="Nationality" value={admission.nationality} />
          <Row label="Caste" value={admission.caste} />
        </InfoCard>

        {/* Admission */}
        <InfoCard icon={BookmarkCheck} title="Admission">
          <Row label="Application no." value={admission.application_no} mono />
          <Row label="Desired class" value={statusClassName(admission)} />
          <Row
            label="Submitted"
            value={admission.submitted_at ? formatDate(admission.submitted_at) : null}
          />
          <Row
            label="Current status"
            value={accent.label}
            valueClassName={cn("font-semibold", statusTextClass(admission.status))}
          />
          <Row
            label="Reviewed"
            value={decided && admission.reviewed_at ? formatDate(admission.reviewed_at) : null}
          />
          <Row
            label="Reviewed by"
            value={decided ? admission.reviewed_by?.name : null}
          />
        </InfoCard>

        {/* Guardian */}
        <InfoCard icon={Users} title="Guardian">
          <SubHeading>Father</SubHeading>
          <Row label="Name" value={guardianName(admission.father_name_en, admission.father_name_bn)} />
          <Row label="NID" value={admission.father_nid} mono />
          <Row label="Mobile" value={admission.father_mobile} mono />
          <Row label="Email" value={admission.father_email} />
          <SubHeading>Mother</SubHeading>
          <Row label="Name" value={guardianName(admission.mother_name_en, admission.mother_name_bn)} />
          <Row label="NID" value={admission.mother_nid} mono />
          <Row label="Mobile" value={admission.mother_mobile} mono />
          <Row label="Email" value={admission.mother_email} />
        </InfoCard>

        {/* Address */}
        <InfoCard icon={MapPin} title="Address">
          <div className="flex items-center gap-2 pb-0.5 pt-3">
            <span className="text-[13px] text-copy-muted">Present</span>
            <span className="inline-flex items-center rounded-md bg-[#edfcf3] px-2 py-0.5 text-[11px] font-semibold text-[#047857] dark:bg-[#05281e] dark:text-[#34d399]">
              Current
            </span>
          </div>
          <Row label="Village / street" value={admission.present_village} />
          <Row label="Post office" value={admission.present_post_office} />
          <Row label="Upazila" value={admission.present_upazila} />
          <Row label="District" value={admission.present_district} />
          <Row label="Division" value={admission.present_division} />

          <div className="mt-1 flex items-center gap-2 border-t border-surface-border-subtle pb-0.5 pt-3.5">
            <span className="text-[13px] text-copy-muted">Permanent</span>
            {sameAddress ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-2 py-0.5 text-[11px] font-semibold text-copy-secondary">
                <Check className="size-2.5" strokeWidth={2.5} aria-hidden />
                Same as present
              </span>
            ) : null}
          </div>
          <Row label="Village / street" value={admission.permanent_village} />
          <Row label="Post office" value={admission.permanent_post_office} />
          <Row label="Upazila" value={admission.permanent_upazila} />
          <Row label="District" value={admission.permanent_district} />
          <Row label="Division" value={admission.permanent_division} />
        </InfoCard>
      </div>

      {/* Previous education */}
      <div className="mt-5 rounded-2xl border border-surface-border bg-surface px-6 py-[22px] shadow-md">
        <CardHeader icon={GraduationCap} title="Previous education" className="mb-[18px]" />
        {education.length === 0 ? (
          <EmptyState
            title="No previous education"
            description="The applicant didn't provide prior education details."
            className="border-0 bg-transparent py-6"
          />
        ) : (
          <>
            {/* Table ≥ sm */}
            <div className="hidden overflow-hidden rounded-xl border border-surface-border sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Passing year</TableHead>
                    <TableHead>Board roll</TableHead>
                    <TableHead>Board reg. no.</TableHead>
                    <TableHead className="text-right">GPA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {education.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-copy-primary">
                        {row.exam_name || `Exam ${i + 1}`}
                      </TableCell>
                      <TableCell className="whitespace-normal text-copy-secondary">
                        {row.institution_name || EMPTY}
                      </TableCell>
                      <TableCell className="text-copy-secondary">
                        {row.passing_year || EMPTY}
                      </TableCell>
                      <TableCell className="font-mono text-copy-secondary">
                        {row.board_roll || EMPTY}
                      </TableCell>
                      <TableCell className="font-mono text-copy-secondary">
                        {row.board_reg_no || EMPTY}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.gpa ? (
                          <span className="inline-flex items-center rounded-[9px] bg-brand-dim px-2.5 py-1 text-[13px] font-semibold text-brand">
                            GPA {row.gpa}
                          </span>
                        ) : (
                          <span className="text-copy-muted">{EMPTY}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Cards < sm */}
            <ul className="flex flex-col gap-3 sm:hidden">
              {education.map((row, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-surface-border bg-base px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-[42px] shrink-0 place-items-center rounded-[10px] border border-surface-border bg-surface text-[13px] font-bold text-brand">
                      {examAbbr(row.exam_name, i)}
                    </div>
                    <div className="min-w-0 flex-1 text-sm font-semibold text-copy-primary">
                      {row.exam_name || `Exam ${i + 1}`}
                    </div>
                    {row.gpa ? (
                      <div className="inline-flex shrink-0 items-center rounded-[9px] bg-brand-dim px-3 py-1.5 text-[13px] font-semibold text-brand">
                        GPA {row.gpa}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-2.5 border-t border-surface-border-subtle">
                    <Row label="Institution" value={row.institution_name} />
                    <Row label="Passing year" value={row.passing_year} />
                    <Row label="Board roll" value={row.board_roll} mono />
                    <Row label="Board reg. no." value={row.board_reg_no} mono />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Documents */}
      <div className="mt-5 rounded-2xl border border-surface-border bg-surface px-6 py-[22px] shadow-md">
        <CardHeader icon={FileText} title="Documents" className="mb-[18px]" />
        {documents.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border-[1.5px] border-dashed border-surface-border px-5 py-[34px] text-center">
            <div className="mb-3 grid size-[52px] place-items-center rounded-full bg-subtle text-copy-muted">
              <ImageOff className="size-6" aria-hidden />
            </div>
            <div className="text-sm font-semibold text-copy-primary">
              No documents uploaded
            </div>
            <div className="mt-1 text-[13px] text-copy-muted">
              No supporting documents were attached to this application.
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                      className="flex items-center gap-3 rounded-xl border border-surface-border bg-base px-4 py-3 text-sm transition-colors hover:bg-subtle"
                    >
                      <FileText className="size-4 shrink-0 text-copy-muted" aria-hidden />
                      <span className="min-w-0 flex-1 truncate font-medium text-copy-primary">
                        {label}
                      </span>
                      <Download className="size-4 shrink-0 text-copy-muted" aria-hidden />
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-base px-4 py-3 text-sm text-copy-muted">
                      <FileText className="size-4 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

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

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function BackLink() {
  return (
    <Link
      href="/admissions"
      className="mb-[18px] inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-copy-muted transition-colors hover:text-copy-primary"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back to admissions
    </Link>
  )
}

function CardHeader({
  icon: Icon,
  title,
  className,
}: {
  icon: React.ElementType
  title: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-brand-dim text-brand">
        <Icon className="size-[18px]" aria-hidden />
      </div>
      <span className="text-[15px] font-bold tracking-tight text-copy-primary">
        {title}
      </span>
    </div>
  )
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-surface-border bg-surface px-6 py-[22px] shadow-md">
      <CardHeader icon={icon} title={title} className="mb-2" />
      <div>{children}</div>
    </section>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-0 pb-0.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-copy-muted">
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  mono,
  valueClassName,
}: {
  label: string
  value?: string | null
  mono?: boolean
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-surface-border-subtle py-[13px] first:border-t-0">
      <span className="shrink-0 text-[13px] text-copy-muted">{label}</span>
      <span
        className={cn(
          "min-w-0 text-right text-sm font-medium text-copy-primary",
          mono && "font-mono",
          !value && "text-copy-muted",
          valueClassName
        )}
      >
        {value || EMPTY}
      </span>
    </div>
  )
}

function KeyFact({
  label,
  value,
  mono,
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div className="px-0 sm:px-5 sm:first:pl-0 sm:last:pr-0">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-copy-muted">
        {label}
      </div>
      <div
        className={cn(
          "text-[15px] font-semibold text-copy-primary",
          mono && "font-mono"
        )}
      >
        {value || EMPTY}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusTextClass(status: string): string {
  const key = statusKeyOf(status)
  if (key === "approved") return "text-[#047857] dark:text-[#34d399]"
  if (key === "rejected") return "text-[#dc2626] dark:text-[#f87171]"
  return "text-[#b45309] dark:text-[#fbbf24]"
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  if (!first) return "?"
  const last = words[words.length - 1] ?? first
  if (words.length === 1) return first.slice(0, 2).toUpperCase()
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase()
}

function examAbbr(name: string | null | undefined, index: number): string {
  const value = name?.trim()
  if (!value) return String(index + 1)
  const words = value.split(/\s+/).filter(Boolean)
  if (words.length === 1) return value.slice(0, 3).toUpperCase()
  return words
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 4)
    .toUpperCase()
}

function guardianName(
  en?: string | null,
  bn?: string | null
): string | null {
  const e = en?.trim()
  const b = bn?.trim()
  if (e && b) return `${e} · ${b}`
  return e || b || null
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
