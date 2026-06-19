"use client"

/**
 * Kebab/overflow menu of per-row actions for the academic managers (task 2.2):
 * Edit + Delete (`ui-context.md`, Data Tables). Rendered only where the user
 * holds the write permission; the caller wraps it in `<Can>` so unprivileged
 * users see no actions column at all. Delete uses the destructive variant.
 */

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Button } from "@/components/button"

export interface RowActionsProps {
  onEdit: () => void
  onDelete: () => void
  /** Accessible label naming the entity, e.g. "Grade 6". */
  label: string
}

export function RowActions({ onEdit, onDelete, label }: RowActionsProps) {
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
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" aria-hidden />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
