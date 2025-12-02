"use client"

import { useState, useEffect } from "react"

interface CodeTypingProps {
  code: string
  speed?: number
  onComplete?: () => void
  className?: string
}

export function CodeTyping({ code, speed = 20, onComplete, className }: CodeTypingProps) {
  const [displayedCode, setDisplayedCode] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < code.length) {
      const timeout = setTimeout(() => {
        setDisplayedCode(code.slice(0, currentIndex + 1))
        setCurrentIndex(currentIndex + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else if (onComplete) {
      onComplete()
    }
  }, [currentIndex, code, speed, onComplete])

  return (
    <pre className={className}>
      <code>{displayedCode}</code>
      <span className="animate-pulse">|</span>
    </pre>
  )
}

