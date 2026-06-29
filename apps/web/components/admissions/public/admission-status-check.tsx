"use client"

/**
 * Public admission status check (task 2.9), implemented to the imported Claude
 * Design ("Admission Status Check"). Three screens — a centered lookup form, a
 * "found" application view (dark banner + Submitted/Under Review/Decision stepper
 * + branch/class/session + applicant photo + a Student detail card), and a calm
 * "not found" empty state — plus a separate network/error view the ticket
 * requires (the design mock can't fail with a network error).
 *
 * The design's hardcoded Tailwind colors are mapped onto the app's design-system
 * tokens (`ui-context.md`, no hardcoded hex): slate-900 → `copy-primary`/`surface`,
 * blue-600 → `brand`, emerald-600 → `success`. The route's `AdmissionThemeSurface`
 * already re-points those tokens to the institutional navy-on-white palette.
 *
 * Behaviour follows the ticket: the lookup is URL-driven
 * (`?application_no=&date_of_birth=`) so the component stays mounted across the
 * commit — browser **Back** from a result returns to the form with the typed
 * inputs preserved, while **Try Again** / **Check Another Application** clear them.
 * A `404` (or empty body) shows the generic not-found screen (never revealing
 * whether the number or the DOB was wrong); network/5xx get a distinct retry view.
 */

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, SearchX, Check, User, AlertTriangle } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { DatePicker } from "@workspace/ui/components/date-picker"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { API_BASE_URL, isNotFoundError } from "@/lib/api"
import { Button } from "@/components/button"
import { formatDate } from "@/lib/format"
import { EMPTY_VALUE } from "@/lib/format"
import { usePublicAdmissionStatus } from "@/hooks/admissions"
import {
  statusBranchName,
  statusClassName,
  statusSessionName,
  statusPhotoUrl,
  type AdmissionStatus,
} from "@/types/admission"

const STATUS_ROUTE = "/admissions/status"

/** Institutional brand shown in the header (matches the design). */
const SCHOOL_NAME = "Madani Pathshala"
const SCHOOL_MARK = "M"

const STEPS = ["Submitted", "Under Review", "Decision"] as const

/** Map a raw status to the stepper position: 0 Submitted · 1 Under Review · 2 Decision. */
function statusStepIndex(status: string): number {
  const s = status.trim().toLowerCase()
  if (/(approve|accept|reject|declin)/.test(s)) return 2
  if (/(review|pending|process|payment)/.test(s)) return 1
  return 0
}

/** Human label for a raw status string (`under_review` → `Under review`). */
function statusLabel(status: string): string {
  return status.replace(/_/g, " ").trim() || EMPTY_VALUE
}

/** Absolute URL pass-through; prefix a relative photo path with the API base. */
function resolvePhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

/** A response with no status / name is treated as "not found" (same as a 404). */
function isFound(data: AdmissionStatus | undefined): data is AdmissionStatus {
  return !!data && !!(data.status || data.name_en || data.name_bn)
}

export function AdmissionStatusCheck() {
  const router = useRouter()
  const params = useSearchParams()

  const committedNo = params.get("application_no")?.trim() || null
  const committedDob = params.get("date_of_birth")?.trim() || null
  const submitted = !!(committedNo && committedDob)

  // Typed values — seeded from the URL once, then owned locally so Back preserves
  // them. Never re-synced from the URL (clearing the query must not wipe inputs).
  const [applicationNo, setApplicationNo] = React.useState(committedNo ?? "")
  const [dateOfBirth, setDateOfBirth] = React.useState(committedDob ?? "")
  const [error, setError] = React.useState("")

  const query = usePublicAdmissionStatus({
    applicationNo: submitted ? committedNo : null,
    dateOfBirth: submitted ? committedDob : null,
  })

  const loading = submitted && (query.isPending || query.isFetching)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!applicationNo.trim() || !dateOfBirth.trim()) {
      setError("Please enter both admission number and date of birth.")
      return
    }
    setError("")
    const next = new URLSearchParams({
      application_no: applicationNo.trim(),
      date_of_birth: dateOfBirth.trim(),
    })
    router.push(`${STATUS_ROUTE}?${next}`)
  }

  function reset() {
    setApplicationNo("")
    setDateOfBirth("")
    setError("")
    router.push(STATUS_ROUTE)
  }

  return (
    <div className="mx-auto flex flex-col items-center">
      {submitted && query.isError && !isNotFoundError(query.error) ? (
        <ErrorView onRetry={() => query.refetch()} />
      ) : submitted && query.isError ? (
        <NotFoundView searchedAdm={committedNo ?? ""} onReset={reset} />
      ) : submitted && !loading && !isFound(query.data) ? (
        <NotFoundView searchedAdm={committedNo ?? ""} onReset={reset} />
      ) : submitted && !loading && isFound(query.data) ? (
        <FoundView record={query.data} onReset={reset} />
      ) : (
        <FormView
          admissionNo={applicationNo}
          dob={dateOfBirth}
          error={error}
          loading={loading}
          onAdm={setApplicationNo}
          onDob={setDateOfBirth}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

// ── Form ────────────────────────────────────────────────────────────────────

function FormView(props: {
  admissionNo: string
  dob: string
  error: string
  loading: boolean
  onAdm: (v: string) => void
  onDob: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className="admission-fields w-full max-w-xl">
      <div className="mb-7 text-center">
        <div className="mb-4 inline-flex size-13 items-center justify-center rounded-xl bg-copy-primary text-2xl font-extrabold text-surface shadow-lg shadow-copy-primary/25">
          {SCHOOL_MARK}
        </div>
        <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand">
          {SCHOOL_NAME}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-copy-primary">
          Admission Status Check
        </h1>
        <p className="mx-auto mt-2.5 max-w-sm text-[15px] text-copy-muted">
          Enter your admission number and date of birth to view your application
          status.
        </p>
      </div>

      <Card className="overflow-hidden p-0 shadow-xl shadow-copy-primary/10">
        <div className="h-1.25 bg-linear-to-r from-brand to-brand/60" />
        <CardContent className="p-8">
          <form onSubmit={props.onSubmit} noValidate className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="application_no">
                Admission No.
                <span className="text-error" aria-hidden>
                  {" "}
                  *
                </span>
              </Label>
              <Input
                id="application_no"
                placeholder="e.g. MP-2026-0142"
                value={props.admissionNo}
                onChange={(e) => props.onAdm(e.target.value)}
                autoComplete="off"
                aria-invalid={!!props.error && !props.admissionNo.trim()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_of_birth">
                Date of Birth
                <span className="text-error" aria-hidden>
                  {" "}
                  *
                </span>
              </Label>
              <DatePicker
                id="date_of_birth"
                value={props.dob}
                onValueChange={props.onDob}
                placeholder="Date of birth"
                aria-invalid={!!props.error && !props.dob.trim()}
                captionLayout="dropdown"
                startMonth={new Date(1950, 0)}
                endMonth={new Date()}
                disabledDates={{ after: new Date() }}
              />
            </div>

            {props.error ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-error">
                <span className="flex size-4 items-center justify-center rounded-full bg-error text-[11px] text-surface">
                  !
                </span>
                {props.error}
              </p>
            ) : null}

            <Button
              type="submit"
              loading={props.loading}
              className="h-12 w-full bg-copy-primary text-[16px] font-bold text-surface hover:bg-copy-primary/90"
            >
              {props.loading ? null : <Search className="size-4" aria-hidden />}
              {props.loading ? "Checking…" : "Check Status"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Not found ─────────────────────────────────────────────────────────────--

function NotFoundView({
  searchedAdm,
  onReset,
}: {
  searchedAdm: string
  onReset: () => void
}) {
  return (
    <div className="w-full max-w-xl">
      <Card className="p-12 text-center shadow-xl shadow-copy-primary/10">
        <div className="mx-auto mb-5 flex size-19 items-center justify-center rounded-full bg-error/10">
          <SearchX className="size-9 text-error" aria-hidden />
        </div>
        <h2 className="mb-2.5 text-2xl font-extrabold text-copy-primary">
          No Application Found
        </h2>
        <p className="mx-auto max-w-sm text-[15px] text-copy-muted">
          We couldn&apos;t find an application matching{" "}
          {searchedAdm ? (
            <span className="font-bold text-copy-secondary">{searchedAdm}</span>
          ) : (
            "those details"
          )}{" "}
          and that date of birth. Please double-check your details and try again.
        </p>
        <Button
          onClick={onReset}
          className="mx-auto mt-7 h-12 bg-copy-primary px-8 font-bold text-surface hover:bg-copy-primary/90"
        >
          Try Again
        </Button>
      </Card>
    </div>
  )
}

// ── Network / unexpected error (separate from not-found, per ticket) ─────────-

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full max-w-xl">
      <Card className="p-12 text-center shadow-xl shadow-copy-primary/10">
        <div className="mx-auto mb-5 flex size-19 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle className="size-9 text-warning" aria-hidden />
        </div>
        <h2 className="mb-2.5 text-2xl font-extrabold text-copy-primary">
          Something went wrong
        </h2>
        <p className="mx-auto max-w-sm text-[15px] text-copy-muted">
          Something went wrong. Please try again.
        </p>
        <Button
          onClick={onRetry}
          className="mx-auto mt-7 h-12 bg-copy-primary px-8 font-bold text-surface hover:bg-copy-primary/90"
        >
          Try Again
        </Button>
      </Card>
    </div>
  )
}

// ── Found ─────────────────────────────────────────────────────────────────--

function FoundView({
  record,
  onReset,
}: {
  record: AdmissionStatus
  onReset: () => void
}) {
  const photo = resolvePhotoUrl(statusPhotoUrl(record))
  const branchName = statusBranchName(record)
  const className = statusClassName(record)
  const sessionName = statusSessionName(record)

  const studentRows: { l: string; v: string }[][] = [
    [
      { l: "Name (Bangla)", v: record.name_bn || EMPTY_VALUE },
      { l: "Name (English)", v: record.name_en || EMPTY_VALUE },
    ],
    [
      { l: "Date of birth", v: formatDate(record.date_of_birth) },
      { l: "Birth reg. no.", v: record.birth_reg_no || EMPTY_VALUE },
    ],
    [
      { l: "Religion", v: record.religion || EMPTY_VALUE },
      { l: "Nationality", v: record.nationality || EMPTY_VALUE },
    ],
    [{ l: "Caste", v: record.caste || EMPTY_VALUE }],
  ]

  return (
    <div className="w-full max-w-3xl">
      {/* Header banner */}
      <div className="flex items-start justify-between gap-5 rounded-2xl bg-copy-primary px-8 py-7 shadow-xl shadow-copy-primary/20">
        <div className="flex items-center gap-4">
          <div className="flex size-15 items-center justify-center rounded-2xl border border-surface/15 bg-surface/10 text-2xl font-extrabold text-surface">
            {SCHOOL_MARK}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-surface/60">
              {SCHOOL_NAME}
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-surface">
              Admission Application
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-surface/60">
            Status
          </p>
          <p className="my-0.5 text-2xl font-extrabold capitalize text-surface">
            {statusLabel(record.status)}
          </p>
          {className ? (
            <Badge className="border-transparent bg-brand text-surface hover:bg-brand">
              {className}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Stepper */}
      <Stepper activeIndex={statusStepIndex(record.status)} />

      {/* Branch / Class / Session + photo */}
      <div className="mt-4.5 flex items-stretch gap-4.5">
        <Card className="flex-1 overflow-hidden p-0 shadow-md shadow-copy-primary/5">
          <div className="h-1 bg-linear-to-r from-brand to-brand/60" />
          <CardContent className="px-6 py-1">
            <Row label="Branch" value={branchName || EMPTY_VALUE} divider />
            <Row label="Class" value={className || EMPTY_VALUE} divider />
            <Row label="Session" value={sessionName || EMPTY_VALUE} />
          </CardContent>
        </Card>

        <Card className="flex w-37.5 flex-none p-2.5 shadow-md shadow-copy-primary/5">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Applicant"
              className="flex-1 rounded-lg object-cover"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg bg-subtle text-copy-muted">
              <User className="size-11" aria-hidden />
              <span className="text-[11px] font-semibold">Photo</span>
            </div>
          )}
        </Card>
      </div>

      {/* Student section */}
      <Card className="mt-4.5 overflow-hidden p-0 shadow-md shadow-copy-primary/5">
        <div className="border-b border-surface-border bg-subtle px-6 py-4">
          <span className="text-[13px] font-bold uppercase tracking-[0.12em] text-brand">
            Student
          </span>
        </div>
        <CardContent className="px-6 py-1">
          {studentRows.map((pair, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-1 gap-x-10 sm:grid-cols-2",
                i < studentRows.length - 1 && "border-b border-surface-border"
              )}
            >
              {pair.map((cell) => (
                <Row key={cell.l} label={cell.l} value={cell.v} />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <Button variant="outline" onClick={onReset} className="h-12 px-8 font-bold">
          Check Another Application
        </Button>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  divider,
}: {
  label: string
  value: string
  divider?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-4",
        divider && "border-b border-surface-border"
      )}
    >
      <span className="text-[15px] text-copy-muted">{label}</span>
      <span className="text-[15px] font-bold text-copy-primary">{value}</span>
    </div>
  )
}

function Stepper({ activeIndex }: { activeIndex: number }) {
  return (
    <Card className="mt-4.5 shadow-md shadow-copy-primary/5">
      <CardContent className="flex items-center justify-between px-7 py-5">
        {STEPS.map((label, i) => {
          const done = i < activeIndex
          const active = i === activeIndex
          const reached = i <= activeIndex
          return (
            <React.Fragment key={label}>
              <div className="flex min-w-22.5 flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold",
                    done && "border-success bg-success text-surface",
                    active && "border-brand bg-brand text-surface",
                    !reached && "border-surface-border bg-subtle text-copy-muted"
                  )}
                >
                  {done ? <Check className="size-4" aria-hidden /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    reached ? "text-copy-primary" : "text-copy-muted"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mb-6 h-0.75 flex-1 rounded-full",
                    i < activeIndex ? "bg-success" : "bg-subtle"
                  )}
                />
              ) : null}
            </React.Fragment>
          )
        })}
      </CardContent>
    </Card>
  )
}
