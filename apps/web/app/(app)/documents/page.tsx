"use client"

/**
 * Documents route (feature-spec 17, task 6.1). Gating and content live in
 * `DocumentsPage`, which renders an access-denied state without the
 * `idcard.generate` permission rather than partial UI (`code-standards.md`).
 */

import { DocumentsPage } from "@/components/documents"

export default function Page() {
  return <DocumentsPage />
}
