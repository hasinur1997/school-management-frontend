"use client"

import { Eye, Link2, Mail, MoreHorizontal } from "lucide-react"

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
}

export function ParentRowActions({
  label,
  onView,
  onLinkStudents,
  onResendCredentials,
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
