"use client"

import * as React from "react"
import { AlertTriangle, RotateCcw, type LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@/components/button"

export interface ErrorPanelProps
  extends Omit<React.ComponentProps<"div">, "title"> {
  icon?: LucideIcon
  title?: React.ReactNode
  description?: React.ReactNode
  /** Retry handler; renders a retry button when provided. */
  onRetry?: () => void
  retryLabel?: string
}

/**
 * Recoverable "Something went wrong" panel (icon + message + retry) per
 * `ui-context.md` (Resilience). Consumed by `error.tsx` route segments and the
 * `ErrorBoundary` fallback so the app never white-screens.
 */
export function ErrorPanel({
  icon: Icon = AlertTriangle,
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
  retryLabel = "Try again",
  className,
  ...props
}: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-surface-border bg-surface px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-error/10 text-error">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-sm font-medium text-copy-primary">{title}</p>
        {description ? (
          <p className="text-sm text-copy-muted">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-1">
          <RotateCcw aria-hidden />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback; receives the error and a reset callback. */
  fallback?: (props: { error: Error; reset: () => void }) => React.ReactNode
  /** Notified when an error is caught (e.g. for logging). */
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Root React error boundary: catches render/runtime errors anywhere in its tree
 * and shows a recoverable `ErrorPanel` instead of crashing the app. Per-route
 * `error.tsx` segments handle their own subtree; this guards everything else.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info)
  }

  reset() {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state

    if (error) {
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset })
      }
      return (
        <div className="flex min-h-[40vh] items-center justify-center p-4">
          <ErrorPanel
            description={error.message || undefined}
            onRetry={this.reset}
          />
        </div>
      )
    }

    return this.props.children
  }
}
