import Link from "next/link"
import { GraduationCap } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * App logo + brand, shown in the topbar-left aligned over the sidebar and in the
 * mobile drawer header. `iconOnly` drops the wordmark for the collapsed rail.
 * The school name comes from settings later; a stable brand stands in for now.
 */
export function Brand({
  iconOnly = false,
  className,
}: {
  iconOnly?: boolean
  className?: string
}) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-semibold text-copy-primary", className)}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand text-white">
        <GraduationCap className="size-5" aria-hidden />
      </span>
      {!iconOnly ? (
        <span className="truncate text-base">School MS</span>
      ) : (
        <span className="sr-only">School MS</span>
      )}
    </Link>
  )
}
