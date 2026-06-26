"use client"

/**
 * Parent "Students" list: a paginated, searchable table of the signed-in
 * parent's linked children (`GET /me/students`). The endpoint returns the full
 * linked set as a flat array (a parent has only a handful of children), so the
 * search, class/section filters, and pagination are applied **client-side** here
 * — the staff `/students` table is permission-gated and unreachable for parents.
 *
 * Each row links to `/my-students/{id}`, the read-only student detail. Implements
 * all four states (loading / error / empty / loaded) and is responsive (table ≥
 * md, card list below), mirroring the staff students list.
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronRight, GraduationCap, Lock, Search, X } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Input } from "@workspace/ui/components/input"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { StatusBadge } from "@/components/status-badge"
import { TableSkeleton } from "@/components/skeletons"
import { ListPager } from "@/components/list-pager"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { isForbiddenError, isNotFoundError } from "@/lib/api"
import { useMyStudents } from "@/hooks/parents"
import type { PaginationMeta } from "@/types/api"
import { studentStatusLabel } from "@/types/student"
import { linkedStudentLabel, type LinkedStudent } from "@/types/parent"

const EMPTY = "—"
const PER_PAGE = 15
const ALL = "all"

export function MyStudentsList() {
  const router = useRouter()
  const { data, isPending, isError, error, refetch } = useMyStudents()

  const [searchInput, setSearchInput] = React.useState("")
  const [classFilter, setClassFilter] = React.useState<string>(ALL)
  const [sectionFilter, setSectionFilter] = React.useState<string>(ALL)
  const [page, setPage] = React.useState(1)

  const search = useDebouncedValue(searchInput, 300)

  const students = React.useMemo(() => data ?? [], [data])

  // Filter options are derived from the parent's own linked children, so they
  // only ever offer values that actually appear in the list.
  const classOptions = React.useMemo(
    () => distinct(students.map((s) => s.class)),
    [students]
  )
  const sectionOptions = React.useMemo(
    () =>
      distinct(
        students
          .filter((s) => classFilter === ALL || s.class === classFilter)
          .map((s) => s.section)
      ),
    [students, classFilter]
  )

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (classFilter !== ALL && s.class !== classFilter) return false
      if (sectionFilter !== ALL && s.section !== sectionFilter) return false
      if (!q) return true
      return [s.name_en, s.name_bn, s.admission_no, s.class, s.section]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q))
    })
  }, [students, search, classFilter, sectionFilter])

  const total = filtered.length
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE))
  const current = Math.min(page, lastPage)
  const pageItems = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const meta: PaginationMeta = {
    current_page: current,
    per_page: PER_PAGE,
    from: total === 0 ? 0 : (current - 1) * PER_PAGE + 1,
    to: Math.min(current * PER_PAGE, total),
    total,
    last_page: lastPage,
  }

  const hasFilters =
    search.trim().length > 0 || classFilter !== ALL || sectionFilter !== ALL

  function changeSearch(value: string) {
    setSearchInput(value)
    setPage(1)
  }
  function changeClass(value: string | null) {
    setClassFilter(value ?? ALL)
    setSectionFilter(ALL) // section depends on class
    setPage(1)
  }
  function changeSection(value: string | null) {
    setSectionFilter(value ?? ALL)
    setPage(1)
  }
  function clearFilters() {
    setSearchInput("")
    setClassFilter(ALL)
    setSectionFilter(ALL)
    setPage(1)
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Header />
        <TableSkeleton rows={6} columns={5} />
      </div>
    )
  }

  if (isError) {
    if (isForbiddenError(error) || isNotFoundError(error)) {
      return (
        <div className="flex flex-col gap-4">
          <Header />
          <EmptyState
            icon={Lock}
            title="You don't have access"
            description="This page is only available to linked parent accounts."
          />
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-4">
        <Header />
        <ErrorPanel description="We couldn't load your students." onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Header />

      {/* Toolbar: search grows, compact labeled filters sit alongside it. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search by name, admission no, class, or section…"
            aria-label="Search students"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterSelect
            value={classFilter}
            onValueChange={changeClass}
            allLabel="All classes"
            options={classOptions}
            ariaLabel="Filter by class"
          />
          <FilterSelect
            value={sectionFilter}
            onValueChange={changeSection}
            allLabel="All sections"
            options={sectionOptions}
            ariaLabel="Filter by section"
          />
          {hasFilters ? (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-10 shrink-0 text-copy-muted"
              aria-label="Clear filters"
            >
              <X className="size-4" aria-hidden />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          ) : null}
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No linked students"
          description="No students are linked to this parent account yet."
        />
      ) : pageItems.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No matching students"
          description="No students match the current search or filters."
        />
      ) : (
        <>
          {/* Table ≥ md */}
          <div className="hidden overflow-hidden rounded-xl border border-surface-border bg-surface shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>Admission no</TableHead>
                  <TableHead>Class / Section</TableHead>
                  <TableHead>Roll</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-px" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((student) => (
                  <TableRow
                    key={student.id}
                    className="group cursor-pointer"
                    onClick={() => router.push(`/my-students/${student.id}`)}
                  >
                    <TableCell>
                      <StudentIdentity student={student} />
                    </TableCell>
                    <TableCell className="font-mono text-[13px] text-copy-secondary tabular-nums">
                      {student.admission_no || EMPTY}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {[student.class, student.section].filter(Boolean).join(" · ") || EMPTY}
                    </TableCell>
                    <TableCell className="font-mono text-copy-secondary tabular-nums">
                      {student.roll_no != null && student.roll_no !== ""
                        ? student.roll_no
                        : EMPTY}
                    </TableCell>
                    <TableCell>
                      {student.status ? (
                        <StatusBadge
                          status={student.status}
                          label={studentStatusLabel(student.status)}
                        />
                      ) : (
                        EMPTY
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <ChevronRight
                        className="size-4 text-copy-muted transition-colors group-hover:text-copy-secondary"
                        aria-hidden
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-surface-border px-6 py-3.5">
              <ListPager
                meta={meta}
                page={current}
                lastPage={lastPage}
                unit="student"
                onPage={setPage}
              />
            </div>
          </div>

          {/* Card list < md */}
          <ul className="flex flex-col gap-3 md:hidden">
            {pageItems.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  className="flex w-full min-w-0 flex-col gap-2 rounded-xl border border-surface-border bg-surface p-4 text-left"
                  onClick={() => router.push(`/my-students/${student.id}`)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <StudentIdentity student={student} />
                    {student.status ? (
                      <StatusBadge
                        status={student.status}
                        label={studentStatusLabel(student.status)}
                      />
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-copy-muted">
                    {student.admission_no ? `${student.admission_no} · ` : ""}
                    {[student.class, student.section].filter(Boolean).join(" · ") || EMPTY}
                    {student.roll_no != null && student.roll_no !== ""
                      ? ` · Roll ${student.roll_no}`
                      : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="md:hidden">
            <ListPager
              meta={meta}
              page={current}
              lastPage={lastPage}
              unit="student"
              onPage={setPage}
            />
          </div>
        </>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="min-w-0">
      <h1 className="truncate text-xl font-semibold text-copy-primary">Students</h1>
      <p className="truncate text-sm text-copy-muted">
        View your linked children and open a full read-only profile.
      </p>
    </div>
  )
}

/**
 * A compact, labeled filter select. Uses the render-prop form of `SelectValue`
 * so the trigger shows the human label (e.g. "All classes") rather than the raw
 * `"all"` value.
 */
function FilterSelect({
  value,
  onValueChange,
  allLabel,
  options,
  ariaLabel,
}: {
  value: string
  onValueChange: (value: string | null) => void
  allLabel: string
  options: string[]
  ariaLabel: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-10 w-36 rounded-xl sm:w-40"
      >
        <SelectValue>
          {(selected: string) => (selected === ALL ? allLabel : selected)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function StudentIdentity({ student }: { student: LinkedStudent }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0">
        {student.photo_url ? <AvatarImage src={student.photo_url} alt="" /> : null}
        <AvatarFallback>{studentInitials(student)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-copy-primary">
          {student.name_en || student.name_bn || linkedStudentLabel(student)}
        </p>
        {student.name_en && student.name_bn ? (
          <p className="truncate text-xs text-copy-muted">{student.name_bn}</p>
        ) : null}
      </div>
    </div>
  )
}

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) =>
    a.localeCompare(b)
  )
}

function studentInitials(student: LinkedStudent): string {
  const name = linkedStudentLabel(student)
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "S"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
