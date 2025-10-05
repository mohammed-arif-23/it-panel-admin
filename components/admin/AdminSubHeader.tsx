"use client"

import React from "react"
import { usePathname } from "next/navigation"
import BackButton from "@/components/admin/BackButton"

function toTitleCase(str: string) {
  return str
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

interface Props { basePath?: string }

export default function AdminSubHeader({ basePath = "/admin-renew" }: Props) {
  const pathname = usePathname()

  // Don't show on the root page of the selected basePath
  const hideOn = [basePath]
  const show = !hideOn.includes(pathname)

  // Derive a simple title from the last segment
  const segments = pathname.split("/").filter(Boolean)
  const last = segments[segments.length - 1] || "admin"
  const title = toTitleCase(last)

  if (!show) return null

  return (
    <div className="sticky top-0 z-10 bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        <BackButton href={basePath} label="Back to Admin" />
        <h2 className="text-sm sm:text-base font-medium text-gray-700">{title}</h2>
      </div>
    </div>
  )
}
