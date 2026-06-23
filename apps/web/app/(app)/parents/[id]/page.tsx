"use client"

import * as React from "react"

import { ParentDetail } from "@/components/parents/parent-detail"

export default function ParentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  return <ParentDetail id={String(id)} />
}
