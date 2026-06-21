"use client"

/**
 * Step 7 — Preview. A read-only, true-to-print rendering of the application: it
 * injects the *exact same* markup the downloadable PDF uses (`buildApplicationHtml`)
 * and scales it to fit the wizard column, so what the visitor sees is what they
 * download. "Edit" (handled by the wizard) returns to step 1 with all data
 * retained. Task 2.5.
 */

import * as React from "react"
import type { UseFormReturn } from "react-hook-form"

import type { PublicSettings } from "@/types/admission"
import type { AdmissionFormValues } from "../schema"
import { DOC_WIDTH, buildApplicationHtml } from "../application-template"

export interface StepPreviewProps {
  form: UseFormReturn<AdmissionFormValues>
  settings: PublicSettings
}

export function StepPreview({ form, settings }: StepPreviewProps) {
  const v = form.getValues()

  const branch = (settings.branches ?? []).find((b) => b.id === v.branch_id)
  const branchName = branch?.name ?? `Branch #${v.branch_id}`
  const className =
    (branch?.classes ?? []).find((c) => c.id === v.desired_class_id)?.name ??
    `Class #${v.desired_class_id}`
  const schoolName = settings.school_name ?? branchName

  // Create the preview URL inside the effect so the exact URL we create is the
  // one we revoke — StrictMode-safe (a useMemo URL gets revoked but not recreated).
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

  const html = React.useMemo(
    () =>
      buildApplicationHtml({
        applicationNo: null,
        schoolName,
        branchName,
        className,
        session: String(new Date().getFullYear()),
        values: v,
        photoUrl,
      }),
    [schoolName, branchName, className, v, photoUrl]
  )

  // Scale the fixed-width document down to fit the wizard column. Transforms
  // don't reflow, so the outer wrapper is given the scaled height explicitly.
  const outerRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(1)
  const [height, setHeight] = React.useState<number>()

  React.useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return
    const update = () => {
      const s = Math.min(1, outer.clientWidth / DOC_WIDTH)
      setScale(s)
      setHeight(inner.offsetHeight * s)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(outer)
    return () => ro.disconnect()
  }, [html])

  return (
    <div
      ref={outerRef}
      className="overflow-hidden rounded-xl border border-surface-border"
      style={{ height }}
    >
      <div
        ref={innerRef}
        style={{
          width: DOC_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
