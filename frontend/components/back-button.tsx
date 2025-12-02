"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"

export function BackButton() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const getPreviousPath = () => {
    if (pathname?.includes("/idea")) {
      return "/"
    }
    if (pathname?.includes("/repo")) {
      const projectId = searchParams?.get("projectId")
      return projectId ? `/idea?projectId=${projectId}` : "/idea"
    }
    if (pathname?.includes("/plan")) {
      const projectId = searchParams?.get("projectId")
      return projectId ? `/repo?projectId=${projectId}` : "/repo"
    }
    if (pathname?.includes("/tasks")) {
      const projectId = searchParams?.get("projectId")
      return projectId ? `/plan?projectId=${projectId}` : "/plan"
    }
    if (pathname?.includes("/design")) {
      const projectId = searchParams?.get("projectId")
      return projectId ? `/tasks?projectId=${projectId}` : "/tasks"
    }
    if (pathname?.includes("/execution")) {
      const projectId = searchParams?.get("projectId")
      return projectId ? `/design?projectId=${projectId}` : "/design"
    }
    if (pathname?.includes("/testing")) {
      const projectId = searchParams?.get("projectId")
      return projectId ? `/execution?projectId=${projectId}` : "/execution"
    }
    return "/"
  }

  const handleBack = () => {
    const previousPath = getPreviousPath()
    router.push(previousPath)
  }

  // Don't show back button on landing page
  if (pathname === "/") {
    return null
  }

  return (
    <div className="w-full px-6 py-2">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </div>
  )
}

