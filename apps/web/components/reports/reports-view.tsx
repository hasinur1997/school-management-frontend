"use client"

/**
 * Reports dashboard container (imported "Reports" design). A page header with
 * PDF / Excel / Print actions, one shared filter bar (session · date-range
 * preset · class · payment status), and underline tabs driving the six report
 * surfaces. The active tab is mirrored into `?report=` so it survives a refresh
 * and is shareable; super admins additionally get branch scoping via the global
 * branch switcher.
 *
 * The resolved `[from, to]` window is computed here from the preset (the API
 * takes explicit dates); a custom range only fetches once both bounds are set.
 */

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarRange, FileDown, Printer, Sheet } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { EmptyState } from "@/components/empty-state"
import { Button } from "@/components/button"
import { useBranch } from "@/components/branch/branch-provider"
import { useSessions, useClasses } from "@/hooks/academic"
import { toastSuccess } from "@/lib/toast"
import { saveBlob } from "@/lib/download"
import {
  ANALYTICS_TAB_LABELS,
  rangeLabel as buildRangeLabel,
  type AnalyticsQuery,
  type AnalyticsTab,
  type PaymentStatus,
  type RangePreset,
} from "@/types/analytics"
import { ALL_CLASSES, AnalyticsFilters } from "./analytics-filters"
import { OverviewReport } from "./overview-report"
import { FeesCollectionReport } from "./fees-collection-report"
import { AttendanceReport } from "./attendance-report"
import { ExamsReport } from "./exams-report"
import { AdmissionsReport } from "./admissions-report"
import { ExpensesReport } from "./expenses-report"

const REPORT_TABS: AnalyticsTab[] = [
  "overview",
  "fees",
  "attendance",
  "exams",
  "admissions",
  "expenses",
]

/** Local-date helpers (avoid UTC drift from toISOString). */
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

export function ReportsView() {
  const { isSuperAdmin, branchParam } = useBranch()
  const sessionsQuery = useSessions()
  const classesQuery = useClasses()
  const sessions = sessionsQuery.data ?? []
  const classes = classesQuery.data ?? []

  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [preset, setPreset] = React.useState<RangePreset>("this_month")
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [classId, setClassId] = React.useState<string>(ALL_CLASSES)
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus>("all")
  const [from, setFrom] = React.useState<string | null>(null)
  const [to, setTo] = React.useState<string | null>(null)

  const contentRef = React.useRef<HTMLDivElement>(null)

  // The session is derived, not stored, until the user picks one: fall back to
  // the current session (then the first) so no effect is needed to seed it.
  const effectiveSessionId =
    sessionId ??
    (sessions.find((s) => s.is_current) ?? sessions[0])?.id ??
    null
  const activeSession =
    sessions.find((s) => s.id === effectiveSessionId) ?? null

  const fromUrl = params.get("report") as AnalyticsTab | null
  const active: AnalyticsTab =
    fromUrl && REPORT_TABS.includes(fromUrl) ? fromUrl : "overview"

  const onTabChange = (next: string) => {
    const search = new URLSearchParams(params.toString())
    if (next === "overview") search.delete("report")
    else search.set("report", next)
    const query = search.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  // Resolve the [from, to] window from the preset. Null while the data a preset
  // depends on isn't ready (a custom range without both bounds, or "this
  // session" before sessions load) — the tabs hold until it resolves.
  const range = React.useMemo((): { from: string; to: string } | null => {
    const now = new Date()
    switch (preset) {
      case "this_month":
        return { from: isoDate(startOfMonth(now)), to: isoDate(endOfMonth(now)) }
      case "last_month": {
        const m = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return { from: isoDate(startOfMonth(m)), to: isoDate(endOfMonth(m)) }
      }
      case "last_3_months": {
        const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        return { from: isoDate(startOfMonth(start)), to: isoDate(endOfMonth(now)) }
      }
      case "this_session":
        return activeSession?.start_date && activeSession?.end_date
          ? { from: activeSession.start_date, to: activeSession.end_date }
          : null
      case "custom":
        return from && to ? { from, to } : null
    }
  }, [preset, activeSession, from, to])

  const query: AnalyticsQuery | null = range
    ? {
        from: range.from,
        to: range.to,
        sessionId: effectiveSessionId,
        classId: classId === ALL_CLASSES ? null : classId,
        paymentStatus,
        branchId: isSuperAdmin ? branchParam : undefined,
      }
    : null

  function resetFilters() {
    setPreset("this_month")
    setSessionId(null) // re-derive the current session
    setClassId(ALL_CLASSES)
    setPaymentStatus("all")
    setFrom(null)
    setTo(null)
  }

  function handlePrint() {
    window.print()
  }

  function handlePdf() {
    // The browser print dialog's "Save as PDF" is the native, dependency-free
    // path; the reports content is isolated for print in globals.css.
    toastSuccess("Choose “Save as PDF” in the print dialog.", { id: "report-pdf" })
    window.print()
  }

  /** Serialize every table currently rendered in the reports content to CSV. */
  function handleExcel() {
    const root = contentRef.current
    const tables = root ? Array.from(root.querySelectorAll("table")) : []
    if (tables.length === 0) {
      toastSuccess("Nothing tabular to export on this tab.", { id: "report-xls" })
      return
    }
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines: string[] = []
    for (const table of tables) {
      for (const row of Array.from(table.rows)) {
        const cells = Array.from(row.cells).map((c) =>
          esc((c.textContent ?? "").trim())
        )
        lines.push(cells.join(","))
      }
      lines.push("")
    }
    const blob = new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    })
    saveBlob(blob, `report-${active}.csv`)
  }

  const gated = query === null
  const rangeText = buildRangeLabel(preset, from, to)

  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-copy-primary">
            Reports
          </h1>
          <p className="text-[14.5px] text-copy-secondary">
            Everything happening across the school — money, attendance, results
            and admissions.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" onClick={handlePdf}>
            <FileDown className="size-4" aria-hidden />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExcel}>
            <Sheet className="size-4" aria-hidden />
            Excel
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="size-4" aria-hidden />
            Print
          </Button>
        </div>
      </div>

      <div className="print:hidden">
        <AnalyticsFilters
          sessions={sessions}
          sessionId={effectiveSessionId}
          onSessionChange={setSessionId}
          preset={preset}
          onPresetChange={setPreset}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          classes={classes}
          classId={classId}
          onClassChange={setClassId}
          paymentStatus={paymentStatus}
          onPaymentStatusChange={setPaymentStatus}
          onReset={resetFilters}
        />
      </div>

      <div className="flex flex-col gap-5">
        {/* Underline tab strip — built to the design spec (h42, 15px padding,
            2px accent underline on the active tab) rather than the base-ui
            "line" variant, which draws its own dark indicator. */}
        <div
          role="tablist"
          aria-label="Report tabs"
          className="flex items-center gap-1 overflow-x-auto border-b border-surface-border-subtle print:hidden"
        >
          {REPORT_TABS.map((tab) => {
            const isActive = active === tab
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab)}
                className={cn(
                  "h-[42px] flex-none whitespace-nowrap border-b-2 px-[15px] text-sm font-semibold transition-colors",
                  isActive
                    ? "border-brand text-brand"
                    : "border-transparent text-copy-secondary hover:text-copy-primary"
                )}
              >
                {ANALYTICS_TAB_LABELS[tab]}
              </button>
            )
          })}
        </div>

        <div ref={contentRef} className="reports-print-root">
          {gated ? (
            <EmptyState
              icon={CalendarRange}
              title="Pick a date range"
              description="Choose both a start and end date to run the report for a custom period."
            />
          ) : active === "overview" ? (
            <OverviewReport
              query={query!}
              rangeLabel={rangeText}
              onGoFees={() => onTabChange("fees")}
            />
          ) : active === "fees" ? (
            <FeesCollectionReport query={query!} rangeLabel={rangeText} />
          ) : active === "attendance" ? (
            <AttendanceReport query={query!} />
          ) : active === "exams" ? (
            <ExamsReport query={query!} />
          ) : active === "admissions" ? (
            <AdmissionsReport query={query!} />
          ) : (
            <ExpensesReport query={query!} rangeLabel={rangeText} />
          )}
        </div>
      </div>
    </div>
  )
}
