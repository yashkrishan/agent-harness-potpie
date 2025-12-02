"use client"

import { useEffect, useRef, useState } from "react"

interface MermaidDiagramProps {
  chart: string
  id?: string
}

export function MermaidDiagram({ chart, id }: MermaidDiagramProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [rendering, setRendering] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const diagramId = id || `mermaid-${Math.random().toString(36).substr(2, 9)}`

  useEffect(() => {
    if (!chart || !iframeRef.current) {
      setRendering(false)
      return
    }

    // Clean the chart code
    let cleanChart = chart
      .replace(/^```mermaid\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .replace(/\\`/g, '`')
      .trim()
      .replace(/^\n+|\n+$/g, '')

    if (!cleanChart || cleanChart.length === 0) {
      setError("Empty chart")
      setRendering(false)
      return
    }

    const iframe = iframeRef.current
    if (!iframe) return

    // Create HTML content for iframe with Mermaid
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11.12.1/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #ffffff;
      color: #1e293b;
      font-family: inherit;
      overflow: auto;
    }
    .mermaid {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="mermaid">
${cleanChart}
  </div>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: "default",
      securityLevel: "loose",
      fontFamily: "inherit",
      themeVariables: {
        primaryColor: "#3b82f6",
        primaryTextColor: "#1e293b",
        primaryBorderColor: "#1e40af",
        lineColor: "#3b82f6",
        secondaryColor: "#10b981",
        tertiaryColor: "#f59e0b",
        background: "#ffffff",
        mainBkg: "#ffffff",
        secondBkg: "#f8fafc",
        textColor: "#1e293b",
        edgeLabelBackground: "#f1f5f9",
        clusterBkg: "#f8fafc",
        clusterBorder: "#cbd5e1",
        defaultLinkColor: "#3b82f6",
        titleColor: "#1e293b",
        actorBorder: "#3b82f6",
        actorBkg: "#dbeafe",
        actorTextColor: "#1e293b",
        actorLineColor: "#3b82f6",
        signalColor: "#1e293b",
        signalTextColor: "#1e293b",
        labelBoxBkgColor: "#dbeafe",
        labelBoxBorderColor: "#3b82f6",
        labelTextColor: "#1e293b",
        loopTextColor: "#1e293b",
        noteBorderColor: "#f59e0b",
        noteBkgColor: "#fef3c7",
        noteTextColor: "#1e293b",
        activationBorderColor: "#10b981",
        activationBkgColor: "#d1fae5",
        sequenceNumberColor: "#1e293b",
        sectionBkgColor: "#f1f5f9",
        altBkgColor: "#ffffff",
        altBkgColor2: "#f8fafc",
        classText: "#1e293b",
        classBox: "#dbeafe",
        classBoxBorder: "#3b82f6",
        cssClassText: "#1e293b",
        cssClassBox: "#f1f5f9",
        cssClassBoxBorder: "#3b82f6",
        defaultTextColor: "#1e293b",
        mainBkgColor: "#ffffff",
        secondBkgColor: "#f8fafc",
        tertiaryBkgColor: "#f1f5f9",
        primaryBorderColor: "#3b82f6",
        secondaryBorderColor: "#10b981",
        tertiaryBorderColor: "#f59e0b",
        primaryTextColor: "#1e293b",
        secondaryTextColor: "#1e293b",
        tertiaryTextColor: "#1e293b",
        lineColor: "#3b82f6",
        textColor: "#1e293b",
        background: "#ffffff",
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
      },
      sequence: {
        useMaxWidth: true,
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        skip: false,
        activationWidth: 10,
      },
      gantt: {
        useMaxWidth: true,
      },
    });
    
    // Wait for mermaid to render
    window.addEventListener('load', function() {
      mermaid.run();
    });
  </script>
</body>
</html>
    `

    // Set iframe content
    try {
      iframe.srcdoc = htmlContent
      
      // Wait for iframe to load
      iframe.onload = () => {
        setTimeout(() => {
          setRendering(false)
        }, 1000) // Give mermaid time to render
      }
    } catch (err) {
      console.error("MermaidDiagram: Error setting iframe content:", err)
      setError("Failed to render diagram")
      setRendering(false)
    }
  }, [chart, diagramId])

  return (
    <div className="my-6 relative">
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl z-10">
          <div className="text-muted-foreground flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Rendering diagram...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="text-red-400 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="font-semibold mb-2">Error</p>
          <p className="text-xs">{error}</p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full border-2 border-primary/20 rounded-xl bg-background"
        style={{ minHeight: '400px', border: 'none' }}
        sandbox="allow-scripts allow-same-origin"
        title={`Mermaid Diagram ${diagramId}`}
      />
    </div>
  )
}
