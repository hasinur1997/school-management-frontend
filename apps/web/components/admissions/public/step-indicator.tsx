"use client"

/**
 * Wizard step indicator (task 2.5). Shows the ordered steps with the current one
 * highlighted and completed ones marked; clicking a visited step navigates back
 * to it (data is preserved by the single RHF form). Forward jumps are blocked —
 * advancing happens through per-step validation in the wizard.
 */

import { Check } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { STEPS } from "./schema"

export interface StepIndicatorProps {
  current: number
  /** Highest step the visitor has reached; earlier steps are navigable. */
  furthest: number
  onStepSelect: (index: number) => void
}

export function StepIndicator({ current, furthest, onStepSelect }: StepIndicatorProps) {
  return (
    <nav aria-label="Application progress">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {STEPS.map((step, index) => {
          const isCurrent = index === current
          const isDone = index < current
          const isReachable = index <= furthest
          return (
            <li key={step.key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => isReachable && onStepSelect(index)}
                disabled={!isReachable}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  isReachable ? "cursor-pointer" : "cursor-not-allowed",
                  isCurrent
                    ? "bg-brand/10 font-medium text-brand"
                    : isReachable
                      ? "text-copy-secondary hover:bg-subtle"
                      : "text-copy-muted"
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-all",
                    isCurrent
                      ? "border-brand bg-brand text-white ring-4 ring-brand/15"
                      : isDone
                        ? "border-success bg-success/10 text-success"
                        : "border-surface-border text-copy-muted"
                  )}
                >
                  {isDone ? <Check className="size-3.5" aria-hidden /> : index + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < STEPS.length - 1 ? (
                <span className="hidden h-px w-4 bg-surface-border sm:block" aria-hidden />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
