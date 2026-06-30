"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, FileText, GraduationCap, Search, SearchX } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { AcademicSelect } from "@/components/academic/academic-select"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { usePublicSettings } from "@/hooks/admissions"
import { usePublicResultLookup } from "@/hooks/results"
import { isNotFoundError, isValidationError } from "@/lib/api"
import { EMPTY_VALUE, formatDate } from "@/lib/format"
import { EXAM_TYPE_LABELS, EXAM_TYPES, type ExamType } from "@/types/exam"
import type {
  PublicResult,
  PublicResultLookupParams,
} from "@/types/result"

const PUBLIC_RESULTS_ROUTE = "/results/public"

const lookupSchema = z.object({
  roll_no: z
    .string()
    .trim()
    .min(1, "Roll number is required.")
    .regex(/^\d+$/, "Use digits only."),
  branch_id: z.string().trim().min(1, "Select a branch."),
  class_id: z.string().trim().min(1, "Select a class."),
  year: z
    .string()
    .trim()
    .min(1, "Year is required.")
    .regex(/^\d{4}$/, "Enter a 4-digit year."),
  semester: z.string().trim().min(1, "Select a semester."),
})

type LookupValues = z.infer<typeof lookupSchema>
type LookupField = keyof LookupValues

const LOOKUP_FIELDS = new Set<LookupField>([
  "roll_no",
  "branch_id",
  "class_id",
  "year",
  "semester",
])

const SEMESTER_OPTIONS = EXAM_TYPES.map((type) => ({
  value: type,
  label: EXAM_TYPE_LABELS[type],
}))

function currentYear() {
  return String(new Date().getFullYear())
}

function valuesFromParams(params: URLSearchParams): LookupValues {
  return {
    roll_no: params.get("roll_no")?.trim() ?? "",
    branch_id: params.get("branch_id")?.trim() ?? "",
    class_id: params.get("class_id")?.trim() ?? "",
    year: params.get("year")?.trim() ?? currentYear(),
    semester: params.get("semester")?.trim() ?? "final",
  }
}

function toLookupParams(values: LookupValues): PublicResultLookupParams {
  return {
    roll_no: values.roll_no.trim(),
    class_id: values.class_id.trim(),
    year: values.year.trim(),
    semester: values.semester.trim(),
  }
}

function toUrlParams(values: LookupValues): Record<LookupField, string> {
  return {
    roll_no: values.roll_no.trim(),
    branch_id: values.branch_id.trim(),
    class_id: values.class_id.trim(),
    year: values.year.trim(),
    semester: values.semester.trim(),
  }
}

function isSubmitted(values: LookupValues) {
  return Object.values(values).every((value) => value.trim().length > 0)
}

function isFound(data: PublicResult | undefined): data is PublicResult {
  const info = data?.student_information
  if (!info) return false

  return Object.values(info).some((value) => value != null && String(value) !== "")
}

function display(value: string | number | null | undefined): string {
  if (value == null || value === "") return EMPTY_VALUE
  return String(value)
}

function classPublicId(id: number | string, publicId?: string | null) {
  return publicId?.trim() || String(id)
}

export function PublicResultLookup() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramKey = searchParams.toString()
  const committedValues = React.useMemo(
    () => valuesFromParams(new URLSearchParams(paramKey)),
    [paramKey]
  )
  const submitted = isSubmitted(committedValues)

  const form = useForm<LookupValues>({
    resolver: zodResolver(lookupSchema),
    defaultValues: committedValues,
  })
  const selectedBranchId = useWatch({
    control: form.control,
    name: "branch_id",
  })

  React.useEffect(() => {
    form.reset(committedValues)
  }, [committedValues, form, paramKey])

  const settings = usePublicSettings()
  const resultQuery = usePublicResultLookup(
    submitted ? toLookupParams(committedValues) : null
  )

  React.useEffect(() => {
    if (!resultQuery.isError || !isValidationError(resultQuery.error)) return

    let mapped = false
    for (const [field, messages] of Object.entries(resultQuery.error.errors)) {
      if (!LOOKUP_FIELDS.has(field as LookupField)) continue
      form.setError(field as LookupField, {
        type: "server",
        message: messages[0] ?? "Please check this field.",
      })
      mapped = true
    }

    if (!mapped) {
      form.setError("root", {
        type: "server",
        message: resultQuery.error.message,
      })
    }
  }, [form, resultQuery.error, resultQuery.isError])

  React.useEffect(() => {
    if (resultQuery.isSuccess) {
      form.clearErrors()
    }
  }, [form, resultQuery.isSuccess])

  const branchOptions =
    settings.data?.branches.map((branch) => ({
      value: String(branch.id),
      label: branch.name,
    })) ?? []

  const classOptions =
    settings.data?.branches
      .find((branch) => String(branch.id) === selectedBranchId)
      ?.classes.map((schoolClass) => ({
        value: classPublicId(schoolClass.id, schoolClass.public_id),
        label: schoolClass.name,
      })) ?? []

  function submit(values: LookupValues) {
    form.clearErrors()
    const next = new URLSearchParams(toUrlParams(values))
    router.push(`${PUBLIC_RESULTS_ROUTE}?${next.toString()}`)
  }

  function resetLookup() {
    const values = {
      roll_no: "",
      branch_id: "",
      class_id: "",
      year: currentYear(),
      semester: "final",
    }
    form.reset(values)
    router.push(PUBLIC_RESULTS_ROUTE)
  }

  const loading = submitted && (resultQuery.isPending || resultQuery.isFetching)
  const validationError =
    resultQuery.isError && isValidationError(resultQuery.error)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <section className="admission-fields rounded-[20px] border border-surface-border bg-surface p-5 shadow-xl shadow-copy-primary/10 sm:p-7">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Public lookup
            </p>
            <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-copy-primary">
              Result Lookup
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-copy-muted">
              Enter the exact roll number, class, academic year, and semester to
              view the published result returned by the school.
            </p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(submit)}
            noValidate
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)_9rem_12rem_auto]"
          >
            <FormField
              control={form.control}
              name="roll_no"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Roll No</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(event.target.value.replace(/\D/g, ""))
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="12"
                      className="font-mono tabular-nums"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Branch</FormLabel>
                  <FormControl>
                    <AcademicSelect<string>
                      value={field.value || null}
                      onValueChange={(next) => {
                        field.onChange(next ?? "")
                        form.setValue("class_id", "", {
                          shouldDirty: true,
                          shouldValidate: false,
                        })
                      }}
                      options={branchOptions}
                      isLoading={settings.isPending}
                      isError={settings.isError}
                      placeholder="Select branch"
                      emptyPlaceholder="No branches available"
                      errorPlaceholder="Couldn't load branches"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="class_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Class</FormLabel>
                  <FormControl>
                    <AcademicSelect<string>
                      value={field.value || null}
                      onValueChange={(next) => field.onChange(next ?? "")}
                      options={classOptions}
                      isLoading={settings.isPending}
                      isError={settings.isError}
                      disabled={!selectedBranchId}
                      placeholder="Select class"
                      disabledPlaceholder="Select branch first"
                      emptyPlaceholder="No classes for this branch"
                      errorPlaceholder="Couldn't load classes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Year</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="2026"
                      className="font-mono tabular-nums"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="semester"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Semester</FormLabel>
                  <FormControl>
                    <AcademicSelect<ExamType>
                      value={(field.value as ExamType) || null}
                      onValueChange={(next) => field.onChange(next ?? "")}
                      options={SEMESTER_OPTIONS}
                      placeholder="Select semester"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 self-start md:col-span-2 xl:col-span-1 xl:self-end">
              <Button
                type="submit"
                loading={loading}
                disabled={settings.isPending}
                className="h-11 w-full"
              >
                {loading ? null : <Search className="size-4" aria-hidden />}
                {loading ? "Searching..." : "Search result"}
              </Button>
              {submitted ? (
                <Button type="button" variant="outline" onClick={resetLookup}>
                  Clear
                </Button>
              ) : null}
            </div>

            {form.formState.errors.root?.message ? (
              <p className="text-sm font-semibold text-error md:col-span-2 xl:col-span-6">
                {form.formState.errors.root.message}
              </p>
            ) : null}
          </form>
        </Form>
      </section>

      <ResultState
        submitted={submitted}
        loading={loading}
        validationError={validationError}
        query={resultQuery}
        onRetry={() => resultQuery.refetch()}
        onReset={resetLookup}
      />
    </div>
  )
}

function ResultState({
  submitted,
  loading,
  validationError,
  query,
  onRetry,
  onReset,
}: {
  submitted: boolean
  loading: boolean
  validationError: boolean
  query: ReturnType<typeof usePublicResultLookup>
  onRetry: () => void
  onReset: () => void
}) {
  if (!submitted) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Enter result details"
        description="The result lookup runs after you submit the form."
        className="bg-surface"
      />
    )
  }

  if (loading) return <PublicResultSkeleton />

  if (validationError) {
    return (
      <EmptyState
        icon={FileText}
        title="Check the highlighted fields"
        description="The server could not validate those details. Correct the form and search again."
        className="bg-surface"
      />
    )
  }

  if (query.isError && isNotFoundError(query.error)) {
    return <NotFoundPanel onReset={onReset} />
  }

  if (query.isError) {
    return (
      <ErrorPanel
        icon={AlertTriangle}
        title="Couldn't load the result"
        description={query.error.message}
        onRetry={onRetry}
        className="bg-surface"
      />
    )
  }

  if (!isFound(query.data)) {
    return <NotFoundPanel onReset={onReset} />
  }

  return <PublicResultView result={query.data} />
}

function NotFoundPanel({ onReset }: { onReset: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      title="No result found"
      description="No result was found for those details. Please check the roll number, class, year, and semester, then try again."
      action={
        <Button type="button" variant="outline" onClick={onReset}>
          Try again
        </Button>
      }
      className="bg-surface"
    />
  )
}

function PublicResultView({ result }: { result: PublicResult }) {
  const info = result.student_information

  if (!info) return <NotFoundPanel onReset={() => undefined} />

  const rows: Array<[string, string]> = [
    ["Roll No", display(info.roll_no)],
    ["Student Name", display(info.student_name)],
    ["Father Name", display(info.father_name)],
    ["Mother Name", display(info.mother_name)],
    ["Class", display(info.class)],
    ["Section", display(info.section)],
    ["Session", display(info.session)],
    ["Semester", display(info.semester)],
    ["Date of Birth", formatDate(info.date_of_birth)],
    ["Result / GPA", display(info.result)],
  ]

  return (
    <section className="overflow-hidden rounded-[20px] border border-surface-border bg-surface shadow-xl shadow-copy-primary/10">
      <div className="border-b border-surface-border bg-subtle px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Published result
            </p>
            <h2 className="mt-1 truncate text-2xl font-extrabold text-copy-primary">
              {display(info.student_name)}
            </h2>
            <p className="mt-1 font-mono text-sm text-copy-muted">
              Roll {display(info.roll_no)} · {display(info.class)}
            </p>
          </div>
          <div className="rounded-xl border border-accent-soft-border bg-accent-dim px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand">
              Result / GPA
            </p>
            <p className="mt-1 font-mono text-2xl font-extrabold tabular-nums text-copy-primary">
              {display(info.result)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-7">
        <StudentInformation rows={rows} />
        <SubjectResults subjects={result.subjects} />
      </div>
    </section>
  )
}

function StudentInformation({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border border-surface-border">
      <div className="border-b border-surface-border px-4 py-3">
        <h3 className="text-base font-semibold text-copy-primary">
          Student Information
        </h3>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="min-w-0 border-b border-surface-border px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0"
          >
            <dt className="text-[11px] font-bold uppercase tracking-wider text-copy-muted">
              {label}
            </dt>
            <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-copy-primary">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SubjectResults({ subjects }: { subjects: PublicResult["subjects"] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <div className="border-b border-surface-border px-4 py-3">
        <h3 className="text-base font-semibold text-copy-primary">
          Subject Wise Grade/Marks
        </h3>
      </div>

      {subjects.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={FileText}
            title="No subject marks"
            description="The API did not return subject-wise marks for this result."
            className="bg-subtle/30"
          />
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Subject Name</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject, index) => (
                  <TableRow
                    key={`${subject.subject_code ?? "subject"}-${index}`}
                  >
                    <TableCell className="font-mono font-semibold text-copy-primary">
                      {display(subject.subject_code)}
                    </TableCell>
                    <TableCell className="font-medium text-copy-primary">
                      {display(subject.subject_name)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {display(subject.marks)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {display(subject.grade)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 p-4 md:hidden">
            {subjects.map((subject, index) => (
              <div
                key={`${subject.subject_code ?? "subject"}-${index}`}
                className="rounded-lg border border-surface-border bg-subtle p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-brand">
                      {display(subject.subject_code)}
                    </p>
                    <p className="mt-1 break-words font-semibold text-copy-primary">
                      {display(subject.subject_name)}
                    </p>
                  </div>
                  <p className="rounded-lg bg-surface px-2.5 py-1 font-mono text-sm font-bold text-copy-primary">
                    {display(subject.grade)}
                  </p>
                </div>
                <p className="mt-3 text-sm text-copy-muted">
                  Marks:{" "}
                  <span className="font-mono font-semibold text-copy-primary">
                    {display(subject.marks)}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PublicResultSkeleton() {
  return (
    <div
      className="grid gap-4 rounded-[20px] border border-surface-border bg-surface p-5 sm:p-7"
      aria-busy
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl sm:w-36" />
      </div>
      <Skeleton className="h-44 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
