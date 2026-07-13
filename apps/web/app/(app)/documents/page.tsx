"use client"

/**
 * Documents route (feature-spec 17, tasks 6.1 + 6.2). Gating and content live in
 * `DocumentsPage`, which renders an access-denied state without any document
 * permission (`idcard.generate` / `tc.view`) rather than partial UI
 * (`code-standards.md`).
 */

import { DocumentsPage } from "@/components/documents"

export default function Page() {
  return <DocumentsPage />
}
