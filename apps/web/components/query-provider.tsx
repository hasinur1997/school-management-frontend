"use client"

import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"

import { createQueryClient } from "@/lib/api"

/**
 * Mounts TanStack Query for the whole app. The client is created once per
 * browser session via `useState` initializer so navigation never discards the
 * cache, while each SSR render still gets its own isolated client.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
