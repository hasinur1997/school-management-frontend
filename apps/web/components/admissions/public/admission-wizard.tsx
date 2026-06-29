"use client"

/**
 * Public admission wizard (task 2.5) — the standalone, unauthenticated
 * multi-step form. One RHF form holds all data; steps validate only their own
 * fields before advancing, and the step indicator allows back navigation with
 * data preserved. On submit the application is created (multipart) and the flow
 * branches to the payment screen (when enabled) or straight to confirmation.
 *
 * A `422` is mapped onto the matching fields and the wizard jumps to the first
 * step that contains an error (duplicate `birth_reg_no` → inline on Student).
 */

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react"

import { Skeleton } from "@workspace/ui/components/skeleton"
import { Form } from "@workspace/ui/components/form"
import { Button } from "@/components/button"
import { ErrorPanel } from "@/components/error-state"
import { isValidationError } from "@/lib/api"
import { toastError } from "@/lib/toast"
import { FormBanner } from "@/components/academic/management/form-helpers"
import { usePublicSettings, useSubmitAdmission } from "@/hooks/admissions"
import {
  admissionSchema,
  defaultValues,
  STEPS,
  STEP_FIELDS,
  stepForField,
  firstStepWithError,
  type AdmissionFormValues,
} from "./schema"
import { buildAdmissionFormData } from "./build-form-data"
import { fileToDataUrl, type ApplicationSnapshot } from "./application-document"
import {
  loadAdmissionDraft,
  saveAdmissionDraft,
  clearAdmissionDraft,
} from "./admission-draft"
import { StepIndicator } from "./step-indicator"
import { PaymentFlow } from "./payment-flow"
import { ConfirmationScreen } from "./confirmation-screen"
import { StepBranchClass } from "./steps/step-branch-class"
import { StepStudentIdentity } from "./steps/step-student-identity"
import { StepGuardian } from "./steps/step-guardian"
import { StepAddress } from "./steps/step-address"
import { StepPreviousEducation } from "./steps/step-previous-education"
import { StepPhotoDocuments, type PhotoStepHandle } from "./steps/step-photo-documents"
import { StepPreview } from "./steps/step-preview"

const PREVIEW_INDEX = STEPS.length - 1
const PHOTO_INDEX = 5

interface SubmitResult {
  applicationNo: string
  invoiceId: number | string | null
  snapshot: ApplicationSnapshot
}

export interface AdmissionWizardProps {
  /** Set when SSLCommerz returned the visitor; resumes into the payment flow. */
  resumeApplicationNo?: string | null
}

export function AdmissionWizard({ resumeApplicationNo }: AdmissionWizardProps) {
  const settingsQuery = usePublicSettings()
  const submitMutation = useSubmitAdmission()

  const form = useForm<AdmissionFormValues>({
    resolver: zodResolver(admissionSchema),
    defaultValues,
  })

  const [step, setStep] = React.useState(0)
  const [furthest, setFurthest] = React.useState(0)
  const [banner, setBanner] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<SubmitResult | null>(null)
  const [hydrated, setHydrated] = React.useState(false)
  const photoStepRef = React.useRef<PhotoStepHandle>(null)

  // Leaving the photo step bakes the visible crop into `photo` before the
  // cropper unmounts (its object URL is revoked on unmount, so we must finish
  // first). Mirrors the teacher photo dialog, which crops on save.
  async function commitPhotoIfLeaving(fromStep: number) {
    if (fromStep === PHOTO_INDEX) {
      await photoStepRef.current?.commitCrop()
    }
  }

  async function goToStep(index: number) {
    await commitPhotoIfLeaving(step)
    setBanner(null)
    setStep(index)
    setFurthest((f) => Math.max(f, index))
  }

  async function handleNext() {
    const valid = await form.trigger(STEP_FIELDS[step] as (keyof AdmissionFormValues)[])
    if (!valid) return
    await goToStep(Math.min(step + 1, PREVIEW_INDEX))
  }

  // ----- Draft persistence -----------------------------------------------------
  // Restore any saved draft once on mount, then mirror every change back to
  // storage so a refresh resumes exactly where the visitor left off. Returning
  // from the payment gateway means the application was already submitted, so the
  // draft is cleared instead of restored.
  React.useEffect(() => {
    if (resumeApplicationNo) {
      clearAdmissionDraft()
      setHydrated(true)
      return
    }
    const draft = loadAdmissionDraft()
    if (draft) {
      form.reset(draft.values)
      setStep(draft.step)
      setFurthest(draft.furthest)
    }
    setHydrated(true)
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (!hydrated || result) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        void saveAdmissionDraft(form.getValues(), step, furthest)
      }, 400)
    }
    schedule() // persist the latest step/furthest immediately (debounced)
    const subscription = form.watch(() => schedule())
    return () => {
      subscription.unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [hydrated, result, step, furthest, form])

  const onSubmit = form.handleSubmit(
    async (values) => {
      setBanner(null)
      try {
        const res = await submitMutation.mutateAsync(buildAdmissionFormData(values))
        // Capture a snapshot for the client-side "Download Application" document
        // (the photo is embedded as a data URL so it survives in a print window).
        const settings = settingsQuery.data
        const branch = (settings?.branches ?? []).find((b) => b.id === values.branch_id)
        const snapshot: ApplicationSnapshot = {
          applicationNo: res.application_no,
          schoolName: settings?.school_name ?? branch?.name ?? "School",
          branchName: branch?.name ?? `Branch #${values.branch_id}`,
          className:
            (branch?.classes ?? []).find((c) => c.id === values.desired_class_id)?.name ??
            `Class #${values.desired_class_id}`,
          session: String(new Date().getFullYear()),
          values,
          photoDataUrl: values.photo ? await fileToDataUrl(values.photo) : null,
          documentNames: values.documents.map((f) => f.name),
        }
        setResult({
          applicationNo: res.application_no,
          invoiceId: res.invoice_id ?? null,
          snapshot,
        })
        // The application is created — discard the saved draft so a later visit
        // starts fresh rather than resurrecting a submitted application.
        clearAdmissionDraft()
      } catch (error) {
        if (isValidationError(error)) {
          const fields = Object.keys(error.errors)
          for (const field of fields) {
            const message = error.errors[field]?.[0]
            if (message) form.setError(field as keyof AdmissionFormValues, { message })
          }
          // Jump to the first step that actually owns one of the errored fields.
          // If none map to a step (e.g. a field the form doesn't render), surface
          // the API message in the banner instead of silently bouncing to step 1.
          const target = firstStepWithError(fields)
          if (target !== null) {
            goToStep(target)
            const hasUnmapped = fields.some((f) => stepForField(f) === -1)
            if (hasUnmapped) setBanner(error.message)
          } else {
            setBanner(error.message)
          }
          return
        }
        toastError(error, "Couldn't submit your application. Please try again.", {
          id: "admission-submit",
        })
      }
    },
    // Client validation failed — navigate to the first step with an error and
    // tell the visitor, rather than appearing to do nothing.
    (errors) => {
      const target = firstStepWithError(Object.keys(errors))
      if (target !== null) goToStep(target)
      setBanner("Please complete the highlighted fields before submitting.")
    }
  )

  // ----- Settings gate (covers resume + fresh) --------------------------------
  // Also wait for draft hydration so a restored step never flashes step 1 first.
  if (settingsQuery.isLoading || !hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-10 w-32" />
      </div>
    )
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <ErrorPanel
        title="Couldn't load the form"
        description="We couldn't load the admission form. Please try again."
        onRetry={() => settingsQuery.refetch()}
      />
    )
  }

  const settings = settingsQuery.data
  const retryLimit = settings.payment_retry_limit > 0 ? settings.payment_retry_limit : 3

  // ----- Returning from the payment gateway -----------------------------------
  if (resumeApplicationNo) {
    return (
      <PaymentFlow applicationNo={resumeApplicationNo} retryLimit={retryLimit} resume />
    )
  }

  // ----- After a successful submit --------------------------------------------
  if (result) {
    if (settings.admission_payment_enabled && result.invoiceId != null) {
      return (
        <PaymentFlow
          applicationNo={result.applicationNo}
          invoiceId={result.invoiceId}
          retryLimit={retryLimit}
          snapshot={result.snapshot}
        />
      )
    }
    return (
      <ConfirmationScreen applicationNo={result.applicationNo} snapshot={result.snapshot} />
    )
  }

  // ----- Wizard ----------------------------------------------------------------
  const submitting = submitMutation.isPending
  const isPreview = step === PREVIEW_INDEX
  // Progress reflects the current position through the flow (0 → 100%).
  const progress = Math.round((step / PREVIEW_INDEX) * 100)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Application progress"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold text-copy-muted">
          {progress}% complete
        </span>
      </div>

      <StepIndicator current={step} furthest={furthest} onStepSelect={goToStep} />

      <div className="border-t border-surface-border pt-5">
        <h2 className="text-xl font-bold text-copy-primary">{STEPS[step]?.label}</h2>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-copy-muted">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
          <FormBanner message={banner} />

          {step === 0 ? <StepBranchClass form={form} settings={settings} /> : null}
          {step === 1 ? <StepStudentIdentity form={form} /> : null}
          {step === 2 ? <StepGuardian form={form} /> : null}
          {step === 3 ? <StepAddress form={form} /> : null}
          {step === 4 ? <StepPreviousEducation form={form} /> : null}
          {step === 5 ? <StepPhotoDocuments ref={photoStepRef} form={form} /> : null}
          {step === 6 ? <StepPreview form={form} settings={settings} /> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-surface-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goToStep(step - 1)}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  Back
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {isPreview ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => goToStep(0)}
                    disabled={submitting}
                    className="w-full sm:w-auto"
                  >
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </Button>
                  <Button type="submit" loading={submitting} className="w-full sm:w-auto">
                    {submitting ? "Submitting…" : "Submit application"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  Next
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
