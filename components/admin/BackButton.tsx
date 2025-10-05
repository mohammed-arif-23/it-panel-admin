"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface BackButtonProps {
  href?: string
  label?: string
  useHistoryBack?: boolean
  className?: string
}

export default function BackButton({ href = "/admin", label = "Back to Admin", useHistoryBack = false, className = "" }: BackButtonProps) {
  const router = useRouter()

  if (useHistoryBack) {
    return (
      <Button variant="outline" onClick={() => router.back()} className={`inline-flex items-center gap-2 ${className}`}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    )
  }

  return (
    <Link href={href}>
      <Button variant="outline" className={`inline-flex items-center gap-2 ${className}`}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  )
}
