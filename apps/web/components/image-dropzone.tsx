"use client"

/**
 * Reusable image picker that supports both click-to-select and drag-and-drop.
 * Validates type and size client-side, then hands the accepted `File` (or `null`)
 * to the parent via `onSelect`; validation messages go to `onError`. The API
 * stays authoritative — this is a convenience filter, not a security boundary.
 */

import * as React from "react"
import { ImageUp } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export interface ImageDropzoneProps {
  /** Called with the accepted file, or `null` when the selection is cleared/invalid. */
  onSelect: (file: File | null) => void
  /** Called with a human message on a rejected file, or `null` to clear the error. */
  onError: (message: string | null) => void
  /** Accepted MIME types. Defaults to JPG/PNG. */
  accept?: string[]
  /** Maximum size in bytes. Defaults to 2MB. */
  maxBytes?: number
  disabled?: boolean
  className?: string
  "aria-label"?: string
}

const DEFAULT_ACCEPTED = ["image/jpeg", "image/png"]
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024 // 2MB

export function ImageDropzone({
  onSelect,
  onError,
  accept = DEFAULT_ACCEPTED,
  maxBytes = DEFAULT_MAX_BYTES,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Choose an image",
}: ImageDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  function validate(file: File): string | null {
    if (!accept.includes(file.type)) {
      return "Choose a JPG or PNG image."
    }
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024))
      return `The image must be ${mb}MB or smaller.`
    }
    return null
  }

  function handleFiles(files: FileList | null | undefined) {
    onError(null)
    const file = files?.[0] ?? null
    if (!file) {
      onSelect(null)
      return
    }
    const message = validate(file)
    if (message) {
      onSelect(null)
      onError(message)
      return
    }
    onSelect(file)
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    handleFiles(event.dataTransfer.files)
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    if (!disabled) setDragging(true)
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          openPicker()
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragging(false)}
      className={cn(
        "flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-surface-border bg-base px-4 py-6 text-center transition-colors",
        "hover:border-brand focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        dragging && "border-brand bg-brand/5",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <ImageUp className="size-5 text-copy-secondary" />
      <p className="text-sm text-copy-primary">
        <span className="font-medium text-brand">Click to upload</span> or drag
        and drop
      </p>
      <p className="text-xs text-copy-secondary">
        JPG or PNG, {Math.round(maxBytes / (1024 * 1024))}MB or smaller
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        onChange={(event) => handleFiles(event.target.files)}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  )
}
