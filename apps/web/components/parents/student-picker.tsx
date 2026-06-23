"use client"

import * as React from "react"
import { Check, GraduationCap, Loader2, Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { useStudents } from "@/hooks/students"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import {
  studentDisplayName,
  studentInitials,
  type StudentListItem,
} from "@/types/student"

export interface StudentPickerProps {
  value: string[]
  onValueChange: (value: string[]) => void
  disabled?: boolean
  excludeIds?: string[]
  error?: string
}

export function StudentPicker({
  value,
  onValueChange,
  disabled = false,
  excludeIds = [],
  error,
}: StudentPickerProps) {
  const [searchInput, setSearchInput] = React.useState("")
  const search = useDebouncedValue(searchInput, 250)
  const selected = React.useMemo(() => new Set(value), [value])
  const excluded = React.useMemo(() => new Set(excludeIds), [excludeIds])

  const { data, isPending, isError, isFetching, refetch } = useStudents({
    search,
    page: 1,
    per_page: 8,
  })

  const students = (data?.data ?? []).filter((student) => !excluded.has(student.id))

  function toggle(student: StudentListItem) {
    if (disabled) return
    if (selected.has(student.id)) {
      onValueChange(value.filter((id) => id !== student.id))
      return
    }
    onValueChange([...value, student.id])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-copy-muted"
          aria-hidden
        />
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search students by name, admission no, or mobile…"
          className="h-9 pl-8"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
        />
      </div>

      <div
        className="min-h-44 rounded-xl border border-surface-border bg-subtle/40 p-2"
        aria-busy={isFetching}
      >
        {isPending ? (
          <div className="flex h-36 items-center justify-center text-sm text-copy-muted">
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            Loading students…
          </div>
        ) : isError ? (
          <div className="flex h-36 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-copy-muted">Couldn&rsquo;t load students.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : students.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center gap-2 text-center text-copy-muted">
            <GraduationCap className="size-6" aria-hidden />
            <p className="text-sm">
              {search.trim() ? "No matching students." : "No students available."}
            </p>
          </div>
        ) : (
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {students.map((student) => {
              const checked = selected.has(student.id)
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(student)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                    aria-pressed={checked}
                  >
                    <Avatar className="size-8 shrink-0">
                      {student.photo_url ? <AvatarImage src={student.photo_url} alt="" /> : null}
                      <AvatarFallback>{studentInitials(student)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-copy-primary">
                        {studentDisplayName(student)}
                      </span>
                      <span className="block truncate text-xs text-copy-muted">
                        {[student.admission_no, student.class, student.section]
                          .filter(Boolean)
                          .join(" · ") || "No current class"}
                      </span>
                    </span>
                    <span
                      className={
                        checked
                          ? "flex size-6 items-center justify-center rounded-full bg-brand text-surface"
                          : "size-6 rounded-full border border-surface-border bg-surface"
                      }
                      aria-hidden
                    >
                      {checked ? <Check className="size-4" /> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {value.length > 0 ? (
        <p className="text-xs text-copy-muted">
          {value.length} student{value.length === 1 ? "" : "s"} selected.
        </p>
      ) : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  )
}
