"use client"

/**
 * Kebab/overflow menu of per-student actions (task 2.7): View profile, plus the
 * update-gated Edit / Change photo / Toggle status and the create-gated Resend
 * credentials. The manage items are hidden when the user lacks `student.update`;
 * resend follows the backend route's `student.create` gate. View is always
 * available to anyone who can see the list. The status toggle and resend confirm
 * first via their dialogs (owned by the caller). A TC student can't be
 * status-toggled here (issued via Documents 6.2), so that item is hidden for them.
 */

import {
  Eye,
  ImageUp,
  Mail,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@/components/button"
import { usePermission } from "@/hooks/auth/use-permission"
import { STUDENT_CREATE, STUDENT_DELETE, STUDENT_UPDATE } from "./permissions"

export interface StudentRowActionsProps {
  label: string
  isActive: boolean
  /** TC students can't be edited/toggled — only viewed. */
  isTc: boolean
  onView: () => void
  onEdit: () => void
  onChangePhoto: () => void
  onToggleStatus: () => void
  onResendCredentials: () => void
  onDelete: () => void
}

export function StudentRowActions({
  label,
  isActive,
  isTc,
  onView,
  onEdit,
  onChangePhoto,
  onToggleStatus,
  onResendCredentials,
  onDelete,
}: StudentRowActionsProps) {
  const canManage = usePermission(STUDENT_UPDATE)
  const canResend = usePermission(STUDENT_CREATE)
  const canDelete = usePermission(STUDENT_DELETE)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={`Actions for ${label}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onView}>
          <Eye className="size-4" aria-hidden />
          View profile
        </DropdownMenuItem>
        {canManage && !isTc ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onChangePhoto}>
              <ImageUp className="size-4" aria-hidden />
              Change photo
            </DropdownMenuItem>
            {canResend ? (
              <DropdownMenuItem onClick={onResendCredentials}>
                <Mail className="size-4" aria-hidden />
                Resend credentials
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleStatus}>
              {isActive ? (
                <PowerOff className="size-4" aria-hidden />
              ) : (
                <Power className="size-4" aria-hidden />
              )}
              {isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
          </>
        ) : null}
        {canDelete ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
              Move to trash
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
