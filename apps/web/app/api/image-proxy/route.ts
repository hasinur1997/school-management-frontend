/**
 * Same-origin image proxy (task 6.1). The student photo is served by the Laravel
 * media host (`app-api.test`), which is cross-origin to this app — so a browser
 * `fetch` of it (to inline the photo into the client-rendered ID card PDF) is
 * blocked by CORS, and drawing it onto a canvas would taint it. Routing the
 * photo through this handler makes it same-origin, so both the on-screen preview
 * and the rasterized PDF get the real photo.
 *
 * The proxy is **scoped to the configured API host only** — an arbitrary `url`
 * is rejected — so it can't be used as an open proxy / SSRF vector.
 */

import { NextResponse, type NextRequest } from "next/server"

const API_HOST = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://app-api.test/api/v1"
    ).host
  } catch {
    return "app-api.test"
  }
})()

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url")
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 })
  }

  if (
    (target.protocol !== "http:" && target.protocol !== "https:") ||
    target.host !== API_HOST
  ) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 })
  }

  let upstream: Response
  try {
    upstream = await fetch(target.toString(), {
      // Media is public; no credentials needed. Bound the wait so a slow media
      // host can't hang the request indefinitely.
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Upstream error" },
      { status: upstream.status }
    )
  }

  const contentType = upstream.headers.get("content-type") ?? ""
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Not an image" }, { status: 415 })
  }

  const body = await upstream.arrayBuffer()
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=300",
    },
  })
}
