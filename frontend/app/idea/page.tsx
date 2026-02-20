"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { IdeaForm } from "@/components/idea-form";
import { createProject } from "@/lib/api";
import { validateIdea } from "@/lib/validations";

function IdeaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingSteps, setParsingSteps] = useState<string[]>([]);

  const initialIdea = isDemo
    ? "Implement keyboard shortcuts for canvas navigation in Azimutt - zoom with =/-,  pan with Shift+Arrow keys, and tool switching"
    : "";

  const simulateParsing = async () => {
    const steps = [
      "Cloning repository...",
      "Analyzing directory structure...",
      "Detecting tech stack...",
      "Parsing routing files...",
      "Extracting API endpoints...",
      "Analyzing database schema...",
      "Identifying components...",
      "Repository analysis complete!",
    ];

    setParsingSteps([]);
    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setParsingSteps((prev) => [...prev, steps[i]]);
      setParsingProgress(((i + 1) / steps.length) * 100);
    }
  };

  const handleSubmit = async (ideaText: string) => {
    setError(null);
    
    // Validate input using Zod schema
    const validation = validateIdea(ideaText);
    if (!validation.success) {
      setError(validation.error);
      return;
    }

    setLoading(true);

    try {
      // Create project with validated input
      const project = await createProject(validation.data);
      setProjectId(project.id);
      
      // Navigate to repo page
      router.push(`/repo?projectId=${project.id}`);
    } catch (err) {
      console.error("Failed to create project:", err);
      setError("Failed to create project. Please try again.");
      toast.error("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
          <IdeaForm
            idea={initialIdea}
            onSubmit={handleSubmit}
            isLoading={loading || parsing}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}

export default function IdeaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      }
    >
      <IdeaPageContent />
    </Suspense>
  );
}
