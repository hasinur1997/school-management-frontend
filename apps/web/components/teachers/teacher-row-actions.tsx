"use client"

/**
 * Kebab/overflow menu of per-teacher actions (task 2.4): View profile, plus the
 * manage-gated Edit / Change photo / Toggle status / Resend credentials / Move
 * to trash. The
 * manage items are hidden when the user lacks `teachers.manage`; View is always
 * available to anyone who can see the list. Status toggle and resend confirm
 * first via their dialogs (owned by the caller).
 */

import {
  MoreHorizontal,
  Pencil,
  ImageUp,
  Power,
  PowerOff,
  Mail,
  Eye,
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
import { TEACHER_MANAGE } from "./permissions"

export interface TeacherRowActionsProps {
  label: string
  isActive: boolean
  /** Whether the current user holds `teacher.delete` (shows Move to trash). */
  canDelete: boolean
  onView: () => void
  onEdit: () => void
  onChangePhoto: () => void
  onToggleStatus: () => void
  onResendCredentials: () => void
  onDelete: () => void
}

export function TeacherRowActions({
  label,
  isActive,
  canDelete,
  onView,
  onEdit,
  onChangePhoto,
  onToggleStatus,
  onResendCredentials,
  onDelete,
}: TeacherRowActionsProps) {
  const canManage = usePermission(TEACHER_MANAGE)

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
        {canManage ? (
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
            <DropdownMenuItem onClick={onResendCredentials}>
              <Mail className="size-4" aria-hidden />
              Resend credentials
            </DropdownMenuItem>
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
              className="text-error focus:text-error"
              onClick={onDelete}
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
