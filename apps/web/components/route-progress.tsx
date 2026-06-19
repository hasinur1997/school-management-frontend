"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Thin top route-change progress indicator (`ui-context.md`, Feedback) so
 * navigations never feel frozen. The App Router exposes no navigation-start
 * event, so the bar ramps up on each completed route change and fades out —
 * giving a consistent top-level progress cue without extra dependencies.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const [width, setWidth] = React.useState(0)
  const [visible, setVisible] = React.useState(false)
  const first = React.useRef(true)
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([])

  React.useEffect(() => {
    // Skip the very first paint; only animate real navigations.
    if (first.current) {
      first.current = false
      return
    }

    const clear = () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }

    clear()
    setVisible(true)
    setWidth(8)

    // Ramp toward the end, then complete and fade out.
    timers.current.push(setTimeout(() => setWidth(80), 50))
    timers.current.push(setTimeout(() => setWidth(100), 350))
    timers.current.push(
      setTimeout(() => {
        setVisible(false)
      }, 600)
    )
    timers.current.push(
      setTimeout(() => {
        setWidth(0)
      }, 800)
    )

    return clear
  }, [pathname])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className={cn(
          "h-full bg-brand transition-[width,opacity] duration-300 ease-out",
          visible ? "opacity-100" : "opacity-0"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
