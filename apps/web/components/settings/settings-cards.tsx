"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { ExternalLink } from "lucide-react"
import {
  useForm,
  useWatch,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form"
import { z } from "zod"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Button } from "@/components/button"
import { CardSkeleton } from "@/components/skeletons"
import { EmptyState } from "@/components/empty-state"
import { ErrorPanel } from "@/components/error-state"
import { FormBanner } from "@/components/academic/management/form-helpers"
import { AcademicSelect } from "@/components/academic"
import { useAuth } from "@/components/auth/auth-provider"
import { BranchAvatar } from "@/components/branch/branch-avatar"
import { useBranch } from "@/components/branch/branch-provider"
import { usePermission } from "@/hooks/auth/use-permission"
import { useSessions } from "@/hooks/academic"
import {
  ApiValidationError,
  isValidationError,
  api,
  queryKey,
  STALE_TIME,
} from "@/lib/api"
import { toastError, toastSuccess } from "@/lib/toast"
import type { AcademicSession } from "@/types/academic"
import type { SettingsPatch, SettingsState } from "@/types/settings"
import { useUpdateSettings } from "@/hooks/settings"
import {
  SettingsPanelControls,
  SettingsPanelStatus,
  SettingsSectionCard,
  SettingsSwitchRow,
} from "./settings-section-card"

const mailFromSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.string().email().safeParse(value).success,
    "Enter a valid email address"
  )

const invoiceDaySchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^(?:[1-9]|1\d|2[0-8])$/.test(value), {
    message: "Enter a day from 1 to 28.",
  })

const hhmmSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
    message: "Use HH:MM in 24-hour time.",
  })

const identitySchema = z.object({
  school_name: z
    .string()
    .trim()
    .min(1, "School name is required")
    .max(150, "Keep it under 150 characters"),
  school_logo: z.string().optional(),
})

const academicSchema = z.object({
  current_session_id: z.string().trim().min(1, "Select the active session"),
})

const paymentSchema = z.object({
  sslcommerz_store_id: z
    .string()
    .trim()
    .max(100, "Keep it under 100 characters")
    .optional(),
  sslcommerz_store_password: z
    .string()
    .trim()
    .max(255, "Keep it under 255 characters")
    .optional(),
  sslcommerz_sandbox: z.boolean(),
})

const notificationSchema = z.object({
  mail_from: mailFromSchema,
  sms_sender_id: z
    .string()
    .trim()
    .max(50, "Keep it under 50 characters")
    .optional(),
  sms_api_key: z
    .string()
    .trim()
    .max(255, "Keep it under 255 characters")
    .optional(),
})

const toggleSchema = z.object({
  partial_payment_enabled: z.boolean(),
  late_fee_enabled: z.boolean(),
  invoice_due_day: invoiceDaySchema,
  teacher_late_threshold: hhmmSchema,
})

type IdentityValues = z.infer<typeof identitySchema>
type AcademicValues = z.infer<typeof academicSchema>
type PaymentValues = z.infer<typeof paymentSchema>
type NotificationValues = z.infer<typeof notificationSchema>
type ToggleValues = z.infer<typeof toggleSchema>

const DESIGN_INPUT_CLASSNAME =
  "h-10 rounded-[10px] border-[#e2e2e6] bg-white px-3 text-[14px] text-[#1b1b1f] placeholder:text-[#9a9aa3] focus-visible:border-[#c9b3f5] focus-visible:ring-3 focus-visible:ring-[#f3effe]"

const DESIGN_FIELD_LABEL_CLASSNAME =
  "text-[12.5px] font-semibold text-[#71717a]"

interface SettingsPanelProps {
  hideFooter?: boolean
  onStatusChange?: (status: SettingsPanelStatus) => void
  onRegisterControls?: (controls: SettingsPanelControls | null) => void
}

function updatePanelStatus(
  notify: SettingsPanelProps["onStatusChange"],
  dirty: boolean,
  submitting: boolean
) {
  notify?.({ dirty, submitting })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Couldn't read the selected image."))
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Couldn't read the selected image."))
    reader.readAsDataURL(file)
  })
}

function schoolInitials(name: string | null | undefined) {
  return (name ?? "School")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function applySettingsFieldErrors<TValues extends FieldValues>(
  form: UseFormReturn<TValues>,
  error: ApiValidationError,
  fields: readonly Path<TValues>[]
): boolean {
  let mapped = false
  for (const field of fields) {
    const message = error.first(`settings.${String(field)}`)
    if (!message) continue
    form.setError(field, { message }, { shouldFocus: !mapped })
    mapped = true
  }
  return mapped
}

function SettingsFormActions({
  dirty,
  loading,
  onReset,
  formId,
  saveLabel = "Save changes",
}: {
  dirty: boolean
  loading: boolean
  onReset: () => void
  formId: string
  saveLabel?: string
}) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={loading || !dirty}
        onClick={onReset}
        className="h-[38px] rounded-[11px] border-[#e2e2e6] bg-white px-3.5 text-[13.5px] font-semibold text-[#1b1b1f] hover:bg-[#f4f4f5]"
      >
        Reset
      </Button>
      <Button
        type="submit"
        form={formId}
        loading={loading}
        disabled={!dirty}
        className="h-[38px] rounded-[11px] bg-[#7c3aed] px-4 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(124,58,237,0.28)] hover:bg-[#6d28d9]"
      >
        {saveLabel}
      </Button>
    </>
  )
}

function LogoPicker({
  value,
  schoolName,
  disabled,
  onChange,
  onError,
}: {
  value: string
  schoolName: string
  disabled: boolean
  onChange: (next: string) => void
  onError: (message: string | null) => void
}) {
  const [reading, setReading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const preview = value.trim() || null

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex size-16 items-center justify-center overflow-hidden rounded-[14px] border border-[#ececef] bg-[#fafafa] text-sm font-bold text-[#71717a]">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="School logo preview"
            className="h-full w-full object-cover"
          />
        ) : (
          schoolInitials(schoolName)
        )}
      </div>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="sr-only"
          disabled={disabled || reading}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setReading(true)
            onError(null)
            void fileToDataUrl(file)
              .then((dataUrl) => onChange(dataUrl))
              .catch((error: unknown) =>
                onError(
                  error instanceof Error
                    ? error.message
                    : "Couldn't read the selected image."
                )
              )
              .finally(() => {
                event.target.value = ""
                setReading(false)
              })
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || reading}
            className="h-8 rounded-[9px] border-[#e2e2e6] bg-white px-3 text-[12.5px] font-semibold text-[#1b1b1f] hover:bg-[#f4f4f5]"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload new
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || reading || !preview}
            className="h-8 rounded-[9px] px-3 text-[12.5px] font-semibold text-[#c2410c] hover:bg-[#fff2e8] hover:text-[#c2410c]"
            onClick={() => {
              onError(null)
              onChange("")
            }}
          >
            Remove logo
          </Button>
        </div>

        <p className="text-[12px] text-[#9a9aa3]">
          {reading
            ? "Reading image…"
            : "PNG or JPG, at least 256×256. Used on all printed documents."}
        </p>
      </div>
    </div>
  )
}

export function IdentitySettingsCard({
  settings,
  hideFooter = false,
  onStatusChange,
  onRegisterControls,
}: { settings: SettingsState } & SettingsPanelProps) {
  const mutation = useUpdateSettings()
  const form = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: {
      school_name: "",
      school_logo: "",
    },
  })
  const [banner, setBanner] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const defaults = React.useMemo(
    () => ({
      school_name: settings.global.school_name ?? "",
      school_logo: settings.global.school_logo ?? "",
    }),
    [settings.global.school_logo, settings.global.school_name]
  )
  const schoolNameValue = useWatch({
    control: form.control,
    name: "school_name",
  })

  React.useEffect(() => {
    form.reset(defaults)
  }, [defaults, form])

  const resetToServer = React.useCallback(() => {
    setBanner(null)
    form.reset(defaults)
  }, [defaults, form])

  React.useEffect(() => {
    updatePanelStatus(
      onStatusChange,
      form.formState.isDirty,
      form.formState.isSubmitting
    )
  }, [
    form.formState.isDirty,
    form.formState.isSubmitting,
    onStatusChange,
  ])

  React.useEffect(() => {
    onRegisterControls?.({
      submit: () => formRef.current?.requestSubmit(),
      reset: resetToServer,
    })
    return () => onRegisterControls?.(null)
  }, [onRegisterControls, resetToServer])

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const dirty = form.formState.dirtyFields
    const patch: SettingsPatch = {}

    if (dirty.school_name) patch.school_name = values.school_name.trim()
    if (dirty.school_logo) patch.school_logo = values.school_logo?.trim() ?? ""

    if (Object.keys(patch).length === 0) return

    try {
      const next = await mutation.mutateAsync(patch)
      form.reset({
        school_name: next.global.school_name ?? "",
        school_logo: next.global.school_logo ?? "",
      })
      toastSuccess("School identity updated.", { id: "settings-identity" })
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applySettingsFieldErrors(form, error, [
          "school_name",
          "school_logo",
        ] as const)
        if (!mapped) setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the school identity.", {
        id: "settings-identity",
      })
    }
  })

  return (
    <SettingsSectionCard
      title="School identity"
      description="Shown on invoices, receipts, ID cards, certificates, and public-facing school pages."
      footer={hideFooter ? undefined : (
        <SettingsFormActions
          dirty={form.formState.isDirty}
          loading={form.formState.isSubmitting}
          formId="settings-identity-form"
          onReset={resetToServer}
        />
      )}
    >
      <Form {...form}>
        <form
          ref={formRef}
          id="settings-identity-form"
          onSubmit={onSubmit}
          onReset={(event) => {
            event.preventDefault()
            resetToServer()
          }}
          className="space-y-5"
          noValidate
        >
          <FormBanner message={banner} />

          <FormField
            control={form.control}
            name="school_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME} required>
                  School name
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={form.formState.isSubmitting}
                    className={DESIGN_INPUT_CLASSNAME}
                    placeholder="e.g. Haji Jabed Ali Memorial School"
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="school_logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME}>
                  School logo
                </FormLabel>
                <LogoPicker
                  value={field.value ?? ""}
                  schoolName={schoolNameValue}
                  disabled={form.formState.isSubmitting}
                  onChange={(next) => {
                    form.clearErrors("school_logo")
                    field.onChange(next)
                  }}
                  onError={(message) => {
                    if (!message) {
                      form.clearErrors("school_logo")
                      return
                    }
                    form.setError("school_logo", { message })
                  }}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SettingsSectionCard>
  )
}

export function BranchesSummaryCard() {
  const { user } = useAuth()
  const { branches, currentBranch } = useBranch()
  const canManageBranches = usePermission("branch.manage")
  const homeBranchId =
    user.branch?.id != null ? String(user.branch.id) : null

  if (branches.length === 0) {
    return null
  }

  return (
    <SettingsSectionCard
      title="Branches"
      description="Each branch keeps its own students, fees, and reports while the global settings above stay shared."
    >
      <div className="divide-y divide-[#ececef] overflow-hidden rounded-[12px] border border-[#ececef] bg-white">
        {branches.map((branch) => {
          const isHome = homeBranchId === branch.id
          const isCurrent = currentBranch?.id === branch.id
          const meta = branch.name_bn?.trim() || branch.address?.trim() || branch.code?.trim()

          return (
            <div
              key={branch.id}
              className="flex items-center gap-3 px-4 py-[14px]"
            >
              <BranchAvatar
                branch={branch}
                className="size-9 rounded-[10px] text-[12px]"
              />

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="truncate text-[14px] font-semibold text-[#1b1b1f]">
                  {branch.name}
                </div>
                <div className="truncate text-[12.5px] text-[#9a9aa3]">
                  {meta || "Accessible in the global branch switcher."}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isHome ? (
                  <span className="inline-flex rounded-full border border-[#e7defb] bg-[#f3effe] px-2.5 py-1 text-[12px] font-semibold text-[#7c3aed]">
                    Main
                  </span>
                ) : null}
                {isCurrent ? (
                  <span className="inline-flex rounded-full border border-[#e2e2e6] bg-[#fafafa] px-2.5 py-1 text-[12px] font-semibold text-[#71717a]">
                    Active
                  </span>
                ) : null}
                {canManageBranches ? (
                  <Link
                    href="/academic?tab=branches"
                    className="text-[12.5px] font-semibold text-[#7c3aed] transition-colors hover:text-[#6d28d9]"
                  >
                    Manage
                  </Link>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {canManageBranches ? (
        <div className="pt-1">
          <Link
            href="/academic?tab=branches"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#7c3aed] transition-colors hover:text-[#6d28d9]"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Open branch manager
          </Link>
        </div>
      ) : null}
    </SettingsSectionCard>
  )
}

export function AcademicSessionCard({
  settings,
  hideFooter = false,
  onStatusChange,
  onRegisterControls,
}: { settings: SettingsState } & SettingsPanelProps) {
  const mutation = useUpdateSettings()
  const sessionsQuery = useSessions()
  const storedSession = settings.global.current_session_id
  const detailQuery = useQuery({
    queryKey: queryKey("sessions", "detail", {
      id: typeof storedSession === "number" ? storedSession : "",
    }),
    queryFn: () => api.get<AcademicSession>(`/sessions/${storedSession}`),
    enabled: typeof storedSession === "number" && Number.isFinite(storedSession),
    staleTime: STALE_TIME.REFERENCE,
  })

  const resolvedSessionId = React.useMemo(() => {
    if (typeof storedSession === "string" && storedSession.trim()) {
      return storedSession
    }
    if (detailQuery.data?.id) {
      return detailQuery.data.id
    }
    return sessionsQuery.data?.find((session) => session.is_current)?.id ?? ""
  }, [storedSession, detailQuery.data, sessionsQuery.data])

  const form = useForm<AcademicValues>({
    resolver: zodResolver(academicSchema),
    defaultValues: {
      current_session_id: "",
    },
  })
  const [banner, setBanner] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (
      typeof storedSession === "number" &&
      detailQuery.isPending &&
      !detailQuery.data
    ) {
      return
    }

    form.reset({
      current_session_id: resolvedSessionId,
    })
  }, [storedSession, detailQuery.data, detailQuery.isPending, resolvedSessionId, form])

  const resetToServer = React.useCallback(() => {
    setBanner(null)
    form.reset({
      current_session_id: resolvedSessionId,
    })
  }, [form, resolvedSessionId])

  const options = (sessionsQuery.data ?? []).map((session) => ({
    value: session.id,
    label: session.name || `Session #${session.id}`,
  }))

  const loading = sessionsQuery.isPending || detailQuery.isPending
  const error = sessionsQuery.error ?? detailQuery.error

  React.useEffect(() => {
    if (loading || error || options.length === 0) {
      updatePanelStatus(onStatusChange, false, false)
      return
    }

    updatePanelStatus(
      onStatusChange,
      form.formState.isDirty,
      form.formState.isSubmitting
    )
  }, [
    error,
    form.formState.isDirty,
    form.formState.isSubmitting,
    loading,
    onStatusChange,
    options.length,
  ])

  React.useEffect(() => {
    onRegisterControls?.({
      submit: () => formRef.current?.requestSubmit(),
      reset: resetToServer,
    })
    return () => onRegisterControls?.(null)
  }, [onRegisterControls, resetToServer])

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    if (!form.formState.dirtyFields.current_session_id) return

    try {
      const next = await mutation.mutateAsync({
        current_session_id: values.current_session_id,
      })

      const nextStored = next.global.current_session_id
      form.reset({
        current_session_id:
          typeof nextStored === "string" && nextStored.trim()
            ? nextStored
            : values.current_session_id,
      })
      toastSuccess("Active session updated.", { id: "settings-session" })
    } catch (submitError) {
      if (isValidationError(submitError)) {
        const mapped = applySettingsFieldErrors(form, submitError, [
          "current_session_id",
        ] as const)
        if (!mapped) setBanner(submitError.message)
        return
      }
      toastError(submitError, "Couldn't save the active session.", {
        id: "settings-session",
      })
    }
  })

  if (loading) {
    return <CardSkeleton className="min-h-[18rem]" />
  }

  if (error) {
    return (
      <SettingsSectionCard
        title="Academic session"
        description="Select which existing session is currently active across the school."
      >
        <ErrorPanel
          description="We couldn't load the academic sessions."
          onRetry={() => {
            void sessionsQuery.refetch()
            if (detailQuery.isError) void detailQuery.refetch()
          }}
        />
      </SettingsSectionCard>
    )
  }

  if (options.length === 0) {
    return (
      <SettingsSectionCard
        title="Academic session"
        description="Select which existing session is currently active across the school."
      >
        <EmptyState
          title="No sessions yet"
          description="Create an academic session in Academic management before selecting the active session here."
        />
      </SettingsSectionCard>
    )
  }

  return (
    <SettingsSectionCard
      title="Academic session"
      description="The active session applies to admissions, invoicing, and results across the school."
      footer={hideFooter ? undefined : (
        <SettingsFormActions
          dirty={form.formState.isDirty}
          loading={form.formState.isSubmitting}
          formId="settings-academic-form"
          onReset={resetToServer}
        />
      )}
    >
      <Form {...form}>
        <form
          ref={formRef}
          id="settings-academic-form"
          onSubmit={onSubmit}
          onReset={(event) => {
            event.preventDefault()
            resetToServer()
          }}
          className="space-y-5"
          noValidate
        >
          <FormBanner message={banner} />

          <FormField
            control={form.control}
            name="current_session_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME} required>
                  Active session
                </FormLabel>
                <AcademicSelect
                  value={field.value || null}
                  onValueChange={(next) => field.onChange(next ?? "")}
                  options={options}
                  placeholder="Select a session"
                  emptyPlaceholder="No sessions available"
                  disabled={form.formState.isSubmitting}
                  className="rounded-[10px]"
                  aria-label="Active session"
                />
                <FormDescription className="text-[12.5px] text-[#9a9aa3]">
                  The selected session is stored in global settings; the session list itself is managed in Academic structure.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SettingsSectionCard>
  )
}

export function PaymentCredentialsCard({
  settings,
  hideFooter = false,
  onStatusChange,
  onRegisterControls,
}: { settings: SettingsState } & SettingsPanelProps) {
  const mutation = useUpdateSettings()
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      sslcommerz_store_id: "",
      sslcommerz_store_password: "",
      sslcommerz_sandbox: false,
    },
  })
  const [banner, setBanner] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const defaults = React.useMemo(
    () => ({
      sslcommerz_store_id: settings.global.sslcommerz_store_id ?? "",
      sslcommerz_store_password: "",
      sslcommerz_sandbox: settings.global.sslcommerz_sandbox === true,
    }),
    [
      settings.global.sslcommerz_sandbox,
      settings.global.sslcommerz_store_id,
    ]
  )

  React.useEffect(() => {
    form.reset(defaults)
  }, [defaults, form])

  const resetToServer = React.useCallback(() => {
    setBanner(null)
    form.reset(defaults)
  }, [defaults, form])

  React.useEffect(() => {
    updatePanelStatus(
      onStatusChange,
      form.formState.isDirty,
      form.formState.isSubmitting
    )
  }, [
    form.formState.isDirty,
    form.formState.isSubmitting,
    onStatusChange,
  ])

  React.useEffect(() => {
    onRegisterControls?.({
      submit: () => formRef.current?.requestSubmit(),
      reset: resetToServer,
    })
    return () => onRegisterControls?.(null)
  }, [onRegisterControls, resetToServer])

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const dirty = form.formState.dirtyFields
    const patch: SettingsPatch = {}

    if (dirty.sslcommerz_store_id) {
      patch.sslcommerz_store_id = values.sslcommerz_store_id?.trim() ?? ""
    }
    if (dirty.sslcommerz_sandbox) {
      patch.sslcommerz_sandbox = values.sslcommerz_sandbox
    }
    if (values.sslcommerz_store_password?.trim()) {
      patch.sslcommerz_store_password = values.sslcommerz_store_password.trim()
    }

    if (Object.keys(patch).length === 0) return

    try {
      const next = await mutation.mutateAsync(patch)
      form.reset({
        sslcommerz_store_id: next.global.sslcommerz_store_id ?? "",
        sslcommerz_store_password: "",
        sslcommerz_sandbox: next.global.sslcommerz_sandbox === true,
      })
      toastSuccess("Payment gateway settings updated.", {
        id: "settings-payment-credentials",
      })
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applySettingsFieldErrors(form, error, [
          "sslcommerz_store_id",
          "sslcommerz_store_password",
          "sslcommerz_sandbox",
        ] as const)
        if (!mapped) setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the payment credentials.", {
        id: "settings-payment-credentials",
      })
    }
  })

  return (
    <SettingsSectionCard
      title="Payment gateway"
      description="SSLCommerz credentials are masked on read; only newly entered secrets are sent back to the API."
      footer={hideFooter ? undefined : (
        <SettingsFormActions
          dirty={form.formState.isDirty}
          loading={form.formState.isSubmitting}
          formId="settings-payment-form"
          onReset={resetToServer}
        />
      )}
    >
      <Form {...form}>
        <form
          ref={formRef}
          id="settings-payment-form"
          onSubmit={onSubmit}
          onReset={(event) => {
            event.preventDefault()
            resetToServer()
          }}
          className="space-y-5"
          noValidate
        >
          <FormBanner message={banner} />

          <div className="grid gap-5 lg:grid-cols-2">
            <FormField
              control={form.control}
            name="sslcommerz_store_id"
            render={({ field }) => (
              <FormItem>
                  <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME}>
                    Store ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={form.formState.isSubmitting}
                      className={DESIGN_INPUT_CLASSNAME}
                      autoComplete="off"
                      placeholder="e.g. greenfield01"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
            name="sslcommerz_store_password"
            render={({ field }) => (
              <FormItem>
                  <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME}>
                    Store password
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      disabled={form.formState.isSubmitting}
                      className={DESIGN_INPUT_CLASSNAME}
                      autoComplete="new-password"
                      placeholder={
                        settings.global.sslcommerz_store_password.is_set
                          ? "Already set — leave blank to keep"
                          : "Enter the store password"
                      }
                    />
                  </FormControl>
                  <FormDescription className="text-[12.5px] text-[#9a9aa3]">
                    {settings.global.sslcommerz_store_password.is_set
                      ? "Stored securely. Leave blank to keep the current password."
                      : "Only sent when you type a new value."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="sslcommerz_sandbox"
            render={({ field }) => (
              <FormItem className="border-t border-[#ececef] pt-1">
                <SettingsSwitchRow
                  label="Use SSLCommerz sandbox"
                  description="Turn this on for sandbox credentials and test checkouts, or off for live traffic."
                  checked={field.value}
                  disabled={form.formState.isSubmitting}
                  onCheckedChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SettingsSectionCard>
  )
}

export function NotificationCredentialsCard({
  settings,
  hideFooter = false,
  onStatusChange,
  onRegisterControls,
}: {
  settings: SettingsState
} & SettingsPanelProps) {
  const mutation = useUpdateSettings()
  const form = useForm<NotificationValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      mail_from: "",
      sms_sender_id: "",
      sms_api_key: "",
    },
  })
  const [banner, setBanner] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const defaults = React.useMemo(
    () => ({
      mail_from: settings.global.mail_from ?? "",
      sms_sender_id: settings.global.sms_sender_id ?? "",
      sms_api_key: "",
    }),
    [
      settings.global.mail_from,
      settings.global.sms_sender_id,
    ]
  )

  React.useEffect(() => {
    form.reset(defaults)
  }, [defaults, form])

  const resetToServer = React.useCallback(() => {
    setBanner(null)
    form.reset(defaults)
  }, [defaults, form])

  React.useEffect(() => {
    updatePanelStatus(
      onStatusChange,
      form.formState.isDirty,
      form.formState.isSubmitting
    )
  }, [
    form.formState.isDirty,
    form.formState.isSubmitting,
    onStatusChange,
  ])

  React.useEffect(() => {
    onRegisterControls?.({
      submit: () => formRef.current?.requestSubmit(),
      reset: resetToServer,
    })
    return () => onRegisterControls?.(null)
  }, [onRegisterControls, resetToServer])

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const dirty = form.formState.dirtyFields
    const patch: SettingsPatch = {}

    if (dirty.mail_from) patch.mail_from = values.mail_from?.trim() ?? ""
    if (dirty.sms_sender_id) {
      patch.sms_sender_id = values.sms_sender_id?.trim() ?? ""
    }
    if (values.sms_api_key?.trim()) {
      patch.sms_api_key = values.sms_api_key.trim()
    }

    if (Object.keys(patch).length === 0) return

    try {
      const next = await mutation.mutateAsync(patch)
      form.reset({
        mail_from: next.global.mail_from ?? "",
        sms_sender_id: next.global.sms_sender_id ?? "",
        sms_api_key: "",
      })
      toastSuccess("Notification credentials updated.", {
        id: "settings-notification-credentials",
      })
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applySettingsFieldErrors(form, error, [
          "mail_from",
          "sms_sender_id",
          "sms_api_key",
        ] as const)
        if (!mapped) setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the notification credentials.", {
        id: "settings-notification-credentials",
      })
    }
  })

  return (
    <SettingsSectionCard
      title="Notifications"
      description="Sender identity for mail and SMS delivery. Secrets stay write-only when the API masks them."
      footer={hideFooter ? undefined : (
        <SettingsFormActions
          dirty={form.formState.isDirty}
          loading={form.formState.isSubmitting}
          formId="settings-notification-form"
          onReset={resetToServer}
        />
      )}
    >
      <Form {...form}>
        <form
          ref={formRef}
          id="settings-notification-form"
          onSubmit={onSubmit}
          onReset={(event) => {
            event.preventDefault()
            resetToServer()
          }}
          className="space-y-5"
          noValidate
        >
          <FormBanner message={banner} />

          <div className="grid gap-5 lg:grid-cols-2">
            <FormField
              control={form.control}
            name="mail_from"
            render={({ field }) => (
              <FormItem>
                  <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME}>
                    Mail from address
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      disabled={form.formState.isSubmitting}
                      className={DESIGN_INPUT_CLASSNAME}
                      autoComplete="off"
                      placeholder="e.g. noreply@school.example"
                    />
                  </FormControl>
                  <FormDescription className="text-[12.5px] text-[#9a9aa3]">
                    Used as the sender for system emails when mail delivery is configured.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
            name="sms_sender_id"
            render={({ field }) => (
              <FormItem>
                  <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME}>
                    SMS sender ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={form.formState.isSubmitting}
                      className={DESIGN_INPUT_CLASSNAME}
                      autoComplete="off"
                      placeholder="e.g. MADANI-PS"
                    />
                  </FormControl>
                  <FormDescription className="text-[12.5px] text-[#9a9aa3]">
                    The label recipients see on outbound SMS messages.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="sms_api_key"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME}>
                  SMS API key
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    disabled={form.formState.isSubmitting}
                    className={DESIGN_INPUT_CLASSNAME}
                    autoComplete="new-password"
                    placeholder={
                      settings.global.sms_api_key.is_set
                        ? "Already set — leave blank to keep"
                        : "Enter the provider API key"
                    }
                  />
                </FormControl>
                <FormDescription className="text-[12.5px] text-[#9a9aa3]">
                  {settings.global.sms_api_key.is_set
                    ? "Stored securely. Leave blank to keep the current API key."
                    : "Only sent when you provide a new value."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </SettingsSectionCard>
  )
}

export function FeatureTogglesCard({
  settings,
  hideFooter = false,
  onStatusChange,
  onRegisterControls,
}: { settings: SettingsState } & SettingsPanelProps) {
  const mutation = useUpdateSettings()
  const { currentBranch } = useBranch()
  const form = useForm<ToggleValues>({
    resolver: zodResolver(toggleSchema),
    defaultValues: {
      partial_payment_enabled: false,
      late_fee_enabled: false,
      invoice_due_day: "",
      teacher_late_threshold: "",
    },
  })
  const [banner, setBanner] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const defaults = React.useMemo(
    () => ({
      partial_payment_enabled: settings.branch.partial_payment_enabled === true,
      late_fee_enabled: settings.branch.late_fee_enabled === true,
      invoice_due_day:
        settings.branch.invoice_due_day != null
          ? String(settings.branch.invoice_due_day)
          : "",
      teacher_late_threshold: settings.branch.teacher_late_threshold ?? "",
    }),
    [
      settings.branch.invoice_due_day,
      settings.branch.late_fee_enabled,
      settings.branch.partial_payment_enabled,
      settings.branch.teacher_late_threshold,
    ]
  )

  React.useEffect(() => {
    form.reset(defaults)
  }, [defaults, form])

  const resetToServer = React.useCallback(() => {
    setBanner(null)
    form.reset(defaults)
  }, [defaults, form])

  React.useEffect(() => {
    if (!currentBranch) {
      updatePanelStatus(onStatusChange, false, false)
      return
    }

    updatePanelStatus(
      onStatusChange,
      form.formState.isDirty,
      form.formState.isSubmitting
    )
  }, [
    currentBranch,
    form.formState.isDirty,
    form.formState.isSubmitting,
    onStatusChange,
  ])

  React.useEffect(() => {
    onRegisterControls?.({
      submit: () => formRef.current?.requestSubmit(),
      reset: resetToServer,
    })
    return () => onRegisterControls?.(null)
  }, [onRegisterControls, resetToServer])

  const onSubmit = form.handleSubmit(async (values) => {
    setBanner(null)
    const dirty = form.formState.dirtyFields
    const patch: SettingsPatch = {}

    if (dirty.partial_payment_enabled) {
      patch.partial_payment_enabled = values.partial_payment_enabled
    }
    if (dirty.late_fee_enabled) {
      patch.late_fee_enabled = values.late_fee_enabled
    }
    if (dirty.invoice_due_day) {
      if (!values.invoice_due_day.trim()) {
        form.setError("invoice_due_day", {
          message: "Enter a day from 1 to 28.",
        })
        return
      }
      patch.invoice_due_day = Number.parseInt(values.invoice_due_day, 10)
    }
    if (dirty.teacher_late_threshold) {
      if (!values.teacher_late_threshold.trim()) {
        form.setError("teacher_late_threshold", {
          message: "Use HH:MM in 24-hour time.",
        })
        return
      }
      patch.teacher_late_threshold = values.teacher_late_threshold.trim()
    }

    if (Object.keys(patch).length === 0) return

    try {
      const next = await mutation.mutateAsync(patch)
      form.reset({
        partial_payment_enabled: next.branch.partial_payment_enabled === true,
        late_fee_enabled: next.branch.late_fee_enabled === true,
        invoice_due_day:
          next.branch.invoice_due_day != null
            ? String(next.branch.invoice_due_day)
            : "",
        teacher_late_threshold: next.branch.teacher_late_threshold ?? "",
      })
      toastSuccess("Branch rules updated.", { id: "settings-toggles" })
    } catch (error) {
      if (isValidationError(error)) {
        const mapped = applySettingsFieldErrors(form, error, [
          "partial_payment_enabled",
          "late_fee_enabled",
          "invoice_due_day",
          "teacher_late_threshold",
        ] as const)
        if (!mapped) setBanner(error.message)
        return
      }
      toastError(error, "Couldn't save the branch rules.", {
        id: "settings-toggles",
      })
    }
  })

  if (!currentBranch) {
    return (
      <SettingsSectionCard
        title="Fees and billing rules"
        description="These values are stored per branch by the API."
      >
        <EmptyState
          title="Select a branch first"
          description="Choose a branch from the sidebar switcher to edit billing and attendance rules for that branch."
        />
      </SettingsSectionCard>
    )
  }

  return (
    <SettingsSectionCard
      title="Fees and billing rules"
      description={`Editing the active branch: ${currentBranch.name}. Changes here affect invoice due dates, late rules, and partial-payment behavior.`}
      footer={hideFooter ? undefined : (
        <SettingsFormActions
          dirty={form.formState.isDirty}
          loading={form.formState.isSubmitting}
          formId="settings-toggles-form"
          onReset={resetToServer}
        />
      )}
    >
      <Form {...form}>
        <form
          ref={formRef}
          id="settings-toggles-form"
          onSubmit={onSubmit}
          onReset={(event) => {
            event.preventDefault()
            resetToServer()
          }}
          className="space-y-5"
          noValidate
        >
          <FormBanner message={banner} />

          <div className="divide-y divide-[#ececef]">
            <FormField
              control={form.control}
              name="partial_payment_enabled"
              render={({ field }) => (
                <FormItem>
                  <SettingsSwitchRow
                    label="Allow partial payments"
                    description="Guardians and staff can settle a single invoice across several receipts."
                    checked={field.value}
                    disabled={form.formState.isSubmitting}
                    onCheckedChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="late_fee_enabled"
              render={({ field }) => (
                <FormItem>
                  <SettingsSwitchRow
                    label="Late fee"
                    description="Track whether invoices in this branch can apply late-fee behavior after the due date."
                    checked={field.value}
                    disabled={form.formState.isSubmitting}
                    onCheckedChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <FormField
              control={form.control}
              name="invoice_due_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME}>
                    Invoice due day
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      inputMode="numeric"
                      disabled={form.formState.isSubmitting}
                      className={DESIGN_INPUT_CLASSNAME}
                      autoComplete="off"
                      placeholder="1-28"
                    />
                  </FormControl>
                  <FormDescription className="text-[12.5px] text-[#9a9aa3]">
                    Day of the month used for fee-invoice due dates in this branch.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
            name="teacher_late_threshold"
            render={({ field }) => (
              <FormItem>
                  <FormLabel className={DESIGN_FIELD_LABEL_CLASSNAME}>
                    Teacher late threshold
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={form.formState.isSubmitting}
                      className={DESIGN_INPUT_CLASSNAME}
                      autoComplete="off"
                      placeholder="09:15"
                    />
                  </FormControl>
                  <FormDescription className="text-[12.5px] text-[#9a9aa3]">
                    Teachers checking in after this time are treated as late.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </SettingsSectionCard>
  )
}
