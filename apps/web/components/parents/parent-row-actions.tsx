"use client"

import { Eye, Link2, Mail, MoreHorizontal, Trash2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@/components/button"

export interface ParentRowActionsProps {
  label: string
  onView: () => void
  onLinkStudents: () => void
  onResendCredentials: () => void
  onDelete: () => void
}

export function ParentRowActions({
  label,
  onView,
  onLinkStudents,
  onResendCredentials,
  onDelete,
}: ParentRowActionsProps) {
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
          View details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLinkStudents}>
          <Link2 className="size-4" aria-hidden />
          Link students
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onResendCredentials}>
          <Mail className="size-4" aria-hidden />
          Resend credentials
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-error focus:text-error"
          onClick={onDelete}
        >
          <Trash2 className="size-4" aria-hidden />
          Move to trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
