import * as React from "react"
import type { LucideIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"

export interface SettingsPanelStatus {
  dirty: boolean
  submitting: boolean
}

export interface SettingsPanelControls {
  submit: () => void
  reset: () => void
}

export interface SettingsSectionCardProps {
  icon?: LucideIcon
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function SettingsSectionCard({
  icon: Icon,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
}: SettingsSectionCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-[14px] border-[#ececef] bg-white py-0 shadow-[0_1px_3px_rgba(16,16,20,0.05)]",
        className
      )}
    >
      <CardHeader className="border-b border-[#ececef] px-5 py-4 sm:px-[22px] sm:py-[18px]">
        <div className="flex items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#f3effe] text-[#7c3aed]">
              <Icon className="size-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-[15px] font-bold tracking-[-0.01em] text-[#1b1b1f]">
              {title}
            </CardTitle>
            <CardDescription className="text-[12.5px] text-[#9a9aa3]">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn("space-y-[18px] px-5 py-5 sm:px-[22px]", contentClassName)}
      >
        {children}
      </CardContent>
      {footer ? (
        <CardFooter className="justify-end gap-2 border-t border-[#ececef] bg-[#fafafa] px-5 py-[13px] sm:px-[22px]">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  )
}

export interface SettingsSwitchRowProps {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}

export function SettingsSwitchRow({
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: SettingsSwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-[14px]">
      <div className="min-w-0 space-y-0.5">
        <p className="text-[14px] font-semibold text-[#1b1b1f]">{label}</p>
        <p className="text-[12.5px] text-[#9a9aa3]">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-[42px] shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#f3effe] disabled:cursor-not-allowed disabled:opacity-60",
          checked ? "bg-[#7c3aed]" : "bg-[#e2e2e6]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  )
}
