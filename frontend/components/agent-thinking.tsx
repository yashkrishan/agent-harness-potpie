"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface AgentThinkingProps {
  messages?: string[]
  onComplete?: () => void
}

export function AgentThinking({ messages, onComplete }: AgentThinkingProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [displayedMessage, setDisplayedMessage] = useState("")

  const defaultMessages = [
    "Analyzing requirements...",
    "Generating questions...",
    "Processing context...",
    "Almost done..."
  ]

  const messageList = messages || defaultMessages

  useEffect(() => {
    if (currentMessageIndex < messageList.length) {
      const message = messageList[currentMessageIndex]
      let charIndex = 0
      
      const interval = setInterval(() => {
        if (charIndex < message.length) {
          setDisplayedMessage(message.slice(0, charIndex + 1))
          charIndex++
        } else {
          clearInterval(interval)
          setTimeout(() => {
            setDisplayedMessage("")
            setCurrentMessageIndex(prev => prev + 1)
          }, 1000)
        }
      }, 50)

      return () => clearInterval(interval)
    } else if (onComplete) {
      setTimeout(onComplete, 500)
    }
  }, [currentMessageIndex, messageList, onComplete])

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-sm text-muted-foreground min-h-[20px]">
        {displayedMessage}
        <span className="animate-pulse">|</span>
      </div>
    </div>
  )
}

