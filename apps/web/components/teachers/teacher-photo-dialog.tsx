"use client"

/**
 * Photo upload dialog for a teacher (task 2.4). Multipart `POST /teachers/{id}/photo`
 * via `useUploadTeacherPhoto`. Validates type (jpg/png) and size (≤ 2MB) client-side
 * before upload — the API stays authoritative (`422` is surfaced too). Shows a
 * preview of the chosen file, the four states, and a success toast.
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
import { Input } from "@workspace/ui/components/input"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@/components/button"
import { toastError, toastSuccess } from "@/lib/toast"
import { isValidationError } from "@/lib/api"
import { useUploadTeacherPhoto } from "@/hooks/teachers"
import { teacherInitials, type Teacher } from "@/types/teacher"

const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const ACCEPTED = ["image/jpeg", "image/png"]

export interface TeacherPhotoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher: Teacher | null
}

export function TeacherPhotoDialog({
  open,
  onOpenChange,
  teacher,
}: TeacherPhotoDialogProps) {
  const uploadMutation = useUploadTeacherPhoto()
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

  function handleClose(next: boolean) {
    if (uploadMutation.isPending) return
    if (!next) {
      setFile(null)
      setError(null)
    }
    onOpenChange(next)
  }

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setError(null)
    if (!selected) {
      setFile(null)
      return
    }
    if (!ACCEPTED.includes(selected.type)) {
      setFile(null)
      setError("Choose a JPG or PNG image.")
      return
    }
    if (selected.size > MAX_BYTES) {
      setFile(null)
      setError("The image must be 2MB or smaller.")
      return
    }
    setFile(selected)
  }

  async function handleUpload() {
    if (!teacher || !file) return
    setError(null)
    try {
      await uploadMutation.mutateAsync({ id: teacher.id, file })
      toastSuccess("Photo updated.", { id: "teacher-photo" })
      handleClose(false)
    } catch (err) {
      if (isValidationError(err)) {
        setError(err.first("photo") || err.message)
        return
      }
      toastError(err, "Couldn't upload the photo.", { id: "teacher-photo" })
    }
  }

  const uploading = uploadMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update photo</DialogTitle>
          <DialogDescription>
            Upload a JPG or PNG, 2MB or smaller.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16">
            {previewUrl ? (
              <AvatarImage src={previewUrl} alt="" />
            ) : teacher?.photo_url ? (
              <AvatarImage src={teacher.photo_url} alt="" />
            ) : null}
            <AvatarFallback>
              {teacher ? teacherInitials(teacher) : <ImageUp className="size-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleSelect}
              disabled={uploading}
              aria-label="Choose a photo"
            />
            {error ? (
              <p role="alert" className="mt-1.5 text-sm text-error">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => handleClose(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            loading={uploading}
            disabled={!file}
            onClick={handleUpload}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
