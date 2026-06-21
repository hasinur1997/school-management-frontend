"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileQuestion, ArrowLeft, Home } from "lucide-react"

import { Button } from "@/components/button"

/**
 * Root `not-found.tsx` segment. As the app's only `not-found` boundary it also
 * catches every unmatched URL (Next.js routing fallback). Defining it as a real
 * route segment — rather than relying on Next's built-in default — lets the
 * router correctly restore the previous entry on Back. The route-level loading
 * fallback is deliberately scoped to the `(app)` group (not the root) so there
 * is no root-level Suspense fallback for the router to get stuck on when
 * navigating Back from a 404.
 */
export default function NotFound() {
  const router = useRouter()

  // Back restores the previous route via a soft navigation. Because that
  // segment was torn down when this (root-level) not-found boundary mounted,
  // the router can restore it stuck on its `loading.tsx` fallback without ever
  // refetching the page. Refresh the restored route once the history change
  // lands so its content actually streams in. The timeout clears the listener
  // when there is no history entry to go back to (popstate never fires).
  const handleBack = () => {
    const handlePop = () => {
      window.removeEventListener("popstate", handlePop)
      clearTimeout(timer)
      router.refresh()
    }
    const timer = setTimeout(() => {
      window.removeEventListener("popstate", handlePop)
    }, 1000)
    window.addEventListener("popstate", handlePop)
    router.back()
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-surface-border bg-surface px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
          <FileQuestion className="size-6" aria-hidden />
        </span>
        <div className="flex max-w-sm flex-col gap-1">
          <p className="text-sm font-medium text-copy-primary">
            Page not found
          </p>
          <p className="text-sm text-copy-muted">
            The page you&apos;re looking for doesn&apos;t exist or may have been
            moved.
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft aria-hidden />
            Go back
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/" />}>
            <Home aria-hidden />
            Home
          </Button>
        </div>
      </div>
    </div>
  )
}
