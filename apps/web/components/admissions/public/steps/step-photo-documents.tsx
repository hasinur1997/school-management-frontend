"use client"

/**
 * Step 6 — Photo & Documents. Photo is required (JPG/PNG ≤2MB); once picked it
 * opens a circular crop editor (the same `ImageCropper` the teacher photo dialog
 * uses). The visitor pans/zooms, then "Crop & use photo" bakes the circular crop
 * into `photo` and shows it as a finished round preview with "Remove image" /
 * "Recrop" — mirroring the teacher dialog's picked → cropper → image states.
 * Documents are optional (PDF/JPG/PNG ≤5MB each, up to 5). Type/size problems
 * show inline on this step; the schema re-checks on submit. Task 2.5.
 *
 * `photo` is set the moment a file is picked (so the step validates), but holds
 * the *cropped* circle once applied. `rawFile` is the in-editor original; if the
 * visitor leaves mid-edit the wizard calls `commitCrop()` to finalize first.
 */

import * as React from "react"
import { type UseFormReturn } from "react-hook-form"
import { FileText, Plus, X } from "lucide-react"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form"
import { Button } from "@/components/button"
import { ImageDropzone } from "@/components/image-dropzone"
import { ImageCropper, type ImageCropperHandle } from "@/components/image-cropper"
import { Req } from "../fields"
import type { AdmissionFormValues } from "../schema"

const MAX_DOCS = 5
const MAX_DOC_BYTES = 5 * 1024 * 1024
const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Lets the wizard bake the current crop into `photo` before this step unmounts. */
export interface PhotoStepHandle {
  commitCrop: () => Promise<void>
}

export const StepPhotoDocuments = React.forwardRef<
  PhotoStepHandle,
  { form: UseFormReturn<AdmissionFormValues> }
>(function StepPhotoDocuments({ form }, ref) {
  const [photoError, setPhotoError] = React.useState<string | null>(null)
  const [docError, setDocError] = React.useState<string | null>(null)
  const docInputRef = React.useRef<HTMLInputElement>(null)
  const cropperRef = React.useRef<ImageCropperHandle>(null)
  // The original file currently open in the cropper; null once cropped/applied.
  const [rawFile, setRawFile] = React.useState<File | null>(null)

  const photo = form.watch("photo")
  const documents = form.watch("documents")

  // Circular preview of the applied (cropped) photo. One effect owns the object
  // URL so the exact URL created is the one revoked (StrictMode-safe).
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

  // Render the visible circle to a file and set it on the form, then close the
  // editor so the finished round preview shows.
  async function applyCrop() {
    if (!rawFile) return
    setPhotoError(null)
    try {
      const cropped = (await cropperRef.current?.getCroppedFile()) ?? rawFile
      form.setValue("photo", cropped, { shouldValidate: true })
      setRawFile(null)
    } catch {
      // Image not ready yet — leave the editor open so the visitor can retry.
    }
  }

  function removePhoto() {
    setPhotoError(null)
    setRawFile(null)
    form.setValue("photo", null, { shouldValidate: true })
  }

  // If the visitor advances while still in the editor, finalize the crop first
  // (the wizard awaits this before the cropper — and its object URL — unmount).
  React.useImperativeHandle(
    ref,
    () => ({
      async commitCrop() {
        if (rawFile) await applyCrop()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawFile]
  )

  function addDocuments(files: FileList | null) {
    setDocError(null)
    if (!files || files.length === 0) return

    const current = form.getValues("documents")
    const accepted: File[] = []
    let message: string | null = null

    for (const file of Array.from(files)) {
      if (current.length + accepted.length >= MAX_DOCS) {
        message = `Attach at most ${MAX_DOCS} documents.`
        break
      }
      if (!DOC_TYPES.includes(file.type)) {
        message = "Documents must be PDF, JPG, or PNG."
        continue
      }
      if (file.size > MAX_DOC_BYTES) {
        message = "Each document must be 5MB or smaller."
        continue
      }
      accepted.push(file)
    }

    if (accepted.length) {
      form.setValue("documents", [...current, ...accepted], { shouldValidate: true })
    }
    if (message) setDocError(message)
    if (docInputRef.current) docInputRef.current.value = ""
  }

  function removeDocument(index: number) {
    const next = form.getValues("documents").filter((_, i) => i !== index)
    form.setValue("documents", next, { shouldValidate: true })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <FormField
        control={form.control}
        name="photo"
        render={() => (
          <FormItem>
            <FormLabel>
              Student photo
              <Req />
            </FormLabel>
            <FormControl>
              <div className="flex flex-col gap-3">
                {rawFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <ImageCropper ref={cropperRef} file={rawFile} round />
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button type="button" size="sm" onClick={applyCrop}>
                        Crop &amp; use photo
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removePhoto}
                      >
                        <X className="size-4" aria-hidden />
                        Remove image
                      </Button>
                    </div>
                  </div>
                ) : photo && photoUrl ? (
                  <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt="Selected student photo"
                      className="size-40 rounded-full border border-surface-border object-cover"
                    />
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRawFile(photo)}
                      >
                        Recrop
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removePhoto}
                      >
                        <X className="size-4" aria-hidden />
                        Remove image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ImageDropzone
                    accept={["image/jpeg", "image/png"]}
                    maxBytes={2 * 1024 * 1024}
                    onSelect={(file) => {
                      setPhotoError(null)
                      setRawFile(file)
                      form.setValue("photo", file, { shouldValidate: true })
                    }}
                    onError={setPhotoError}
                    aria-label="Upload student photo"
                  />
                )}
                {photoError ? (
                  <p className="text-sm font-medium text-error">{photoError}</p>
                ) : null}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="documents"
        render={() => (
          <FormItem>
            <FormLabel>Documents (optional)</FormLabel>
            <FormControl>
              <div className="flex flex-col gap-3">
                {documents.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {documents.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 rounded-md border border-surface-border bg-surface px-3 py-2"
                      >
                        <FileText className="size-4 shrink-0 text-copy-muted" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm text-copy-primary">
                          {file.name}
                        </span>
                        <span className="shrink-0 text-xs text-copy-muted">
                          {formatBytes(file.size)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(index)}
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="size-4" aria-hidden />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <input
                  ref={docInputRef}
                  type="file"
                  accept={DOC_TYPES.join(",")}
                  multiple
                  className="sr-only"
                  onChange={(e) => addDocuments(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  disabled={documents.length >= MAX_DOCS}
                  onClick={() => docInputRef.current?.click()}
                >
                  <Plus className="size-4" aria-hidden />
                  Add document
                </Button>
                <p className="text-xs text-copy-muted">
                  PDF, JPG, or PNG. Up to {MAX_DOCS} files, 5MB each.
                </p>
                {docError ? (
                  <p className="text-sm font-medium text-error">{docError}</p>
                ) : null}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
})
