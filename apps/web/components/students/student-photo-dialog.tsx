"use client"

/**
 * Photo dialog for a student (task 2.7). When a photo exists it's shown with a
 * "Remove image" option; otherwise an `ImageDropzone` (click-to-select +
 * drag-and-drop) is shown, with an `ImageCropper` once a file is chosen. Upload
 * is multipart `POST /students/{id}/photo` via `useUploadStudentPhoto`. The
 * backend has no photo-delete route, so "Remove image" only clears the current
 * selection back to the picker — there's no destructive save. Validates type
 * (jpg/png) and size (≤ 2MB) client-side; the API stays authoritative (`422`).
 */

import * as React from "react"
import { ImageUp } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@/components/button"
import { ImageDropzone } from "@/components/image-dropzone"
import { ImageCropper, type ImageCropperHandle } from "@/components/image-cropper"
import { toastError, toastSuccess } from "@/lib/toast"
import { isValidationError } from "@/lib/api"
import { useUploadStudentPhoto } from "@/hooks/students"
import { studentInitials, type Student } from "@/types/student"

const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const ACCEPTED = ["image/jpeg", "image/png"]

export interface StudentPhotoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
}

export function StudentPhotoDialog({
  open,
  onOpenChange,
  student,
}: StudentPhotoDialogProps) {
  const uploadMutation = useUploadStudentPhoto()
  const cropperRef = React.useRef<ImageCropperHandle>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // The preview object URL is derived from the chosen file; the effect only
  // revokes the previous URL so it never leaks (no setState in the effect).
  const previewUrl = React.useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  )
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const previewSrc = previewUrl ?? student?.photo_url ?? null
  const hasImage = !!previewSrc
  const busy = uploadMutation.isPending

  function handleClose(next: boolean) {
    if (busy) return
    if (!next) {
      setFile(null)
      setError(null)
    }
    onOpenChange(next)
  }

  function handleRemove() {
    // No delete route — clearing just reveals the existing photo or the picker.
    setError(null)
    setFile(null)
  }

  async function handleSubmit() {
    if (!student || !file) return
    setError(null)
    try {
      const cropped = (await cropperRef.current?.getCroppedFile()) ?? file
      await uploadMutation.mutateAsync({ id: student.id, file: cropped })
      toastSuccess("Photo updated.", { id: "student-photo" })
      handleClose(false)
    } catch (err) {
      if (isValidationError(err)) {
        setError(err.first("photo") || err.message)
        return
      }
      toastError(err, "Couldn't update the photo.", { id: "student-photo" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update photo</DialogTitle>
          {!file ? (
            <DialogDescription>
              Upload a JPG or PNG, 2MB or smaller.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {file ? (
          <div className="flex flex-col items-center gap-3">
            <ImageCropper ref={cropperRef} file={file} />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy}
              onClick={handleRemove}
            >
              Remove image
            </Button>
          </div>
        ) : hasImage ? (
          <div className="flex flex-col items-center gap-3">
            <Avatar className="size-40 shrink-0">
              <AvatarImage
                src={previewSrc ?? undefined}
                alt=""
                className="object-cover"
              />
              <AvatarFallback>
                {student ? (
                  studentInitials(student)
                ) : (
                  <ImageUp className="size-10" />
                )}
              </AvatarFallback>
            </Avatar>
            <ImageDropzone
              onSelect={setFile}
              onError={setError}
              accept={ACCEPTED}
              maxBytes={MAX_BYTES}
              disabled={busy}
              aria-label="Choose a new photo"
            />
          </div>
        ) : (
          <ImageDropzone
            onSelect={setFile}
            onError={setError}
            accept={ACCEPTED}
            maxBytes={MAX_BYTES}
            disabled={busy}
            aria-label="Choose a photo"
          />
        )}

        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            loading={busy}
            disabled={!file}
            onClick={handleSubmit}
          >
            {busy ? "Uploading…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
