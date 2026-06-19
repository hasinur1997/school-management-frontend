"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Palette, Sun } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import { ACCENTS, type Accent, useAccent } from "@/components/accent-provider"

const COLOR_MODES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const { accent, setAccent } = useAccent()

  // Mount guard: theme/accent are client-only, so render a stable placeholder
  // on the server and first client paint to avoid a hydration mismatch.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Theme"
        className="size-11 sm:size-9"
        disabled
      >
        <Palette className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Change theme"
            className="size-11 sm:size-9"
          >
            <Palette className="h-5 w-5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value)}
        >
          <DropdownMenuLabel>Color mode</DropdownMenuLabel>
          {COLOR_MODES.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon className="h-4 w-4" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={accent}
          onValueChange={(value) => setAccent(value as Accent)}
        >
          <DropdownMenuLabel>Accent</DropdownMenuLabel>
          {ACCENTS.map(({ value, label }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {/* Scoped data-accent re-points --accent-primary on this swatch
                  only, so bg-brand renders that accent's color via tokens. */}
              <span
                aria-hidden
                data-accent={value}
                className="size-3 rounded-full border border-surface-border bg-brand"
              />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
