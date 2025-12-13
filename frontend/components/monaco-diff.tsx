"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

// Dynamically import Monaco Editor to avoid SSR issues
const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-[#858585]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ),
  }
);

interface MonacoDiffProps {
  before: string;
  after: string;
  language?: string;
  fileName?: string;
  height?: string | number;
}

export function MonacoDiff({
  before,
  after,
  language,
  fileName,
  height = 600,
}: MonacoDiffProps) {
  const [mounted, setMounted] = useState(false);
  const [editorHeight, setEditorHeight] = useState<number>(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect language from filename if not provided
  const detectedLanguage = useMemo(() => {
    if (language) return language;
    if (!fileName) return "plaintext";

    const ext = fileName.split(".").pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      c: "c",
      cpp: "cpp",
      h: "c",
      hpp: "cpp",
      cs: "csharp",
      go: "go",
      rs: "rust",
      rb: "ruby",
      php: "php",
      swift: "swift",
      kt: "kotlin",
      scala: "scala",
      sh: "shell",
      bash: "shell",
      zsh: "shell",
      yml: "yaml",
      yaml: "yaml",
      json: "json",
      xml: "xml",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "scss",
      less: "less",
      sql: "sql",
      md: "markdown",
      markdown: "markdown",
      dockerfile: "dockerfile",
      tf: "terraform",
      tfvars: "terraform",
    };

    return languageMap[ext || ""] || "plaintext";
  }, [language, fileName]);

  // Handle height calculation and mounting
  useEffect(() => {
    setMounted(true);
    
    const calculateHeight = () => {
      if (typeof height === "number") {
        setEditorHeight(height);
      } else if (typeof height === "string" && height === "100%") {
        // Calculate from parent container
        if (containerRef.current?.parentElement) {
          const parent = containerRef.current.parentElement;
          const rect = parent.getBoundingClientRect();
          setEditorHeight(Math.max(500, rect.height - 20));
        } else {
          // Fallback to viewport height
          setEditorHeight(Math.max(500, window.innerHeight - 300));
        }
      } else {
        setEditorHeight(600);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      calculateHeight();
    }, 100);
    
    // Recalculate on resize
    const resizeObserver = new ResizeObserver(() => {
      calculateHeight();
    });
    
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }
    
    window.addEventListener("resize", calculateHeight);
    
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculateHeight);
    };
  }, [height]);

  // Validate inputs
  if (!before || !after) {
    return (
      <div className="border border-[#3e3e3e] rounded-lg bg-[#1e1e1e] flex items-center justify-center p-8" style={{ minHeight: 500 }}>
        <div className="text-center text-[#858585]">
          <p className="text-sm">No code changes to display</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div 
        ref={containerRef}
        className="border border-[#3e3e3e] rounded-lg bg-[#1e1e1e] flex items-center justify-center" 
        style={{ height: editorHeight, minHeight: 500 }}
      >
        <div className="flex flex-col items-center gap-2 text-[#858585]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="border border-[#3e3e3e] rounded-lg overflow-hidden bg-[#1e1e1e] w-full"
      style={{ height: `${editorHeight}px`, minHeight: "500px" }}
    >
      <DiffEditor
        height={`${editorHeight}px`}
        language={detectedLanguage}
        original={before || ""}
        modified={after || ""}
        theme="vs-dark"
        options={{
          readOnly: false,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: {
            enabled: true,
          },
          renderSideBySide: true,
          enableSplitViewResizing: true,
          renderIndicators: true,
          ignoreTrimWhitespace: false,
          renderOverviewRuler: true,
          overviewRulerLanes: 2,
          diffWordWrap: "off",
          fontSize: 13,
          lineHeight: 20,
          fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', 'Source Code Pro', monospace",
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
          },
        }}
      />
    </div>
  );
}

