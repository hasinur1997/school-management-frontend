"use client"

/**
 * Avatar dialog for the signed-in user. When a photo exists it is shown with a
 * "Remove image" option; otherwise an `ImageDropzone` (click-to-select +
 * drag-and-drop) is shown. Upload is multipart `POST /auth/photo` via
 * `useUploadAvatar`; removing the existing photo and saving issues
 * `DELETE /auth/photo` via `useDeleteAvatar`. "Remove" only clears the dialog —
 * the saved photo is deleted on save, never before. Validates type (jpg/png)
 * and size (≤ 2MB) client-side; the API stays authoritative (`422` is surfaced).
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@/components/button"
import { ImageDropzone } from "@/components/image-dropzone"
import { ImageCropper, type ImageCropperHandle } from "@/components/image-cropper"
import { toastError, toastSuccess } from "@/lib/toast"
import { isValidationError } from "@/lib/api"
import {
  useUploadAvatar,
  useDeleteAvatar,
} from "@/hooks/auth/use-profile-mutations"
import { userInitials, type AuthUser } from "@/types/auth"

const MAX_BYTES = 2 * 1024 * 1024 // 2MB
const ACCEPTED = ["image/jpeg", "image/png"]

export interface ProfilePhotoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AuthUser
}

export function ProfilePhotoDialog({
  open,
  onOpenChange,
  user,
}: ProfilePhotoDialogProps) {
  const uploadMutation = useUploadAvatar()
  const deleteMutation = useDeleteAvatar()
  const cropperRef = React.useRef<ImageCropperHandle>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  // The user marked the existing photo for removal. It is only actually deleted
  // on save; until then "remove" just clears the dialog so they can re-pick.
  const [removed, setRemoved] = React.useState(false)

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

  // Newly chosen file wins; otherwise show the existing photo unless removed.
  const previewSrc = previewUrl ?? (removed ? null : user.photo_url ?? null)
  const hasImage = !!previewSrc
  const isRemoval = !file && removed && !!user.photo_url
  const busy = uploadMutation.isPending || deleteMutation.isPending

  function handleClose(next: boolean) {
    if (busy) return
    if (!next) {
      setFile(null)
      setError(null)
      setRemoved(false)
    }
    onOpenChange(next)
  }

  function handleRemove() {
    setError(null)
    if (file) {
      // Discard the pending selection, revealing the existing photo (or picker).
      setFile(null)
    } else {
      setRemoved(true)
    }
  }

  async function handleSubmit() {
    setError(null)
    try {
      if (file) {
        const cropped =
          (await cropperRef.current?.getCroppedFile()) ?? file
        await uploadMutation.mutateAsync(cropped)
        toastSuccess("Photo updated.", { id: "profile-photo" })
      } else if (isRemoval) {
        await deleteMutation.mutateAsync()
        toastSuccess("Photo removed.", { id: "profile-photo" })
      } else {
        return
      }
      handleClose(false)
    } catch (err) {
      if (isValidationError(err)) {
        setError(err.first("photo") || err.message)
        return
      }
      toastError(err, "Couldn't update the photo.", { id: "profile-photo" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update photo</DialogTitle>
          {!hasImage ? (
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
                {user.name ? (
                  userInitials(user.name)
                ) : (
                  <ImageUp className="size-10" />
                )}
              </AvatarFallback>
            </Avatar>
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
            disabled={!file && !isRemoval}
            onClick={handleSubmit}
          >
            {busy
              ? isRemoval
                ? "Removing…"
                : "Uploading…"
              : isRemoval
                ? "Remove photo"
                : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
