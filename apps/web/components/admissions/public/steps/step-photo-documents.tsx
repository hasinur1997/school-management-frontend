"use client"

/**
 * Step 6 — Photo & Documents. Photo is required (JPG/PNG ≤2MB) and previewed;
 * documents are optional (PDF/JPG/PNG ≤5MB each, up to 5). Type/size problems
 * show inline on this step; the schema re-checks on submit. Task 2.5.
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

export function StepPhotoDocuments({ form }: { form: UseFormReturn<AdmissionFormValues> }) {
  const [photoError, setPhotoError] = React.useState<string | null>(null)
  const [docError, setDocError] = React.useState<string | null>(null)
  const docInputRef = React.useRef<HTMLInputElement>(null)

  const photo = form.watch("photo")
  const documents = form.watch("documents")

  // Object URL for the photo preview. Created and revoked inside one effect so
  // the exact URL is the one revoked — StrictMode-safe (a useMemo URL would be
  // revoked on cleanup but not recreated, breaking the preview).
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
                {photo && photoUrl ? (
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt="Selected student photo"
                      className="size-24 rounded-lg border border-surface-border object-cover"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-copy-primary">{photo.name}</span>
                      <span className="text-xs text-copy-muted">{formatBytes(photo.size)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-fit"
                        onClick={() => {
                          setPhotoError(null)
                          form.setValue("photo", null, { shouldValidate: true })
                        }}
                      >
                        <X className="size-4" aria-hidden />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ImageDropzone
                    accept={["image/jpeg", "image/png"]}
                    maxBytes={2 * 1024 * 1024}
                    onSelect={(file) => {
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
}
