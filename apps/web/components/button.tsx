"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Button as UiButton,
  buttonVariants,
} from "@workspace/ui/components/button"

type UiButtonProps = React.ComponentProps<typeof UiButton>

export interface ButtonProps extends UiButtonProps {
  /**
   * Mutation loading state: disables the button and swaps in a spinner while
   * keeping the label, per `ui-context.md` (Feedback, Loading & Resilience).
   * Never allow a double submit.
   */
  loading?: boolean
}

/**
 * App-level Button wrapper around the generated `components/ui` Button. The UI
 * primitive stays untouched (CLI output only); the `loading` behaviour lives
 * here so every screen gets a consistent disabled + spinner submit state.
 */
function Button({
  loading = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <UiButton
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={loading || disabled}
      className={cn(className)}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </UiButton>
  )
}

export { Button, buttonVariants }
