"use client"

import { Eye, Link2, MoreHorizontal } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@/components/button"

export interface ParentRowActionsProps {
  label: string
  onView: () => void
  onLinkStudents: () => void
}

export function ParentRowActions({ label, onView, onLinkStudents }: ParentRowActionsProps) {
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
