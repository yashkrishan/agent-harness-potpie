"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProject } from "@/lib/api";
import {
  Send,
  Loader2,
  Github,
  CheckCircle2,
  Plus,
  Paperclip,
  Mic,
} from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import Image from "next/image";
import { BorderBeam } from "@/components/ui/border-beam";
import { Card } from "@/components/ui/card";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

function IdeaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [input, setInput] = useState(
    isDemo
      ? "Implement keyboard shortcuts for canvas navigation in Azimutt - zoom with =/-,  pan with Shift+Arrow keys, and tool switching"
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingSteps, setParsingSteps] = useState<string[]>([]);

  // Hardcoded linked repos for demo
  const linkedRepos = [
    {
      id: "1",
      name: "azimuttapp/azimutt",
      url: "https://github.com/azimuttapp/azimutt",
      description: "Database schema explorer and visualizer",
    },
    {
      id: "2",
      name: "azimuttapp/azimutt-js",
      url: "https://github.com/azimuttapp/azimutt-js",
      description: "JavaScript SDK for Azimutt",
    },
    {
      id: "3",
      name: "azimuttapp/elm-json",
      url: "https://github.com/azimuttapp/elm-json",
      description: "JSON encoder/decoder for Elm",
    },
    {
      id: "4",
      name: "azimuttapp/elm-uuid",
      url: "https://github.com/azimuttapp/elm-uuid",
      description: "UUID generation for Elm",
    },
  ];

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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const ideaText = input.trim();
    setLoading(true);

    try {
      // Create project
      const project = await createProject(ideaText);
      setProjectId(project.id);

      // If repo is already selected, go directly to parsing
      if (selectedRepo && selectedRepo !== "connect-repo") {
        setParsing(true);
        // Simulate parsing
        await simulateParsing();

        // Navigate directly to repo page (which shows questions)
        router.push(`/repo?projectId=${project.id}`);
        return;
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
      setParsing(false);
    }
  };

  const handleSelectRepo = async () => {
    if (!selectedRepo || !projectId) return;

    setParsing(true);
    setLoading(true);

    try {
      // Simulate parsing
      await simulateParsing();

      // Navigate to repo page (which now handles questions)
      router.push(`/repo?projectId=${projectId}`);
    } catch (error) {
      console.error("Failed to select repo:", error);
      toast.error("Failed to select repo. Please try again.");
      setParsing(false);
      setLoading(false);
    }
  };

  const handleConnectRepo = () => {
    setSelectedRepo("");
    toast.info("Connect Repo feature coming soon!");
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
          {/* Dot Pattern - Centered behind textarea */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full max-w-2xl flex items-center justify-center">
              <DotPattern
                width={20}
                height={20}
                cx={1}
                cy={1}
                cr={2}
                className={cn(
                  "opacity-40",
                  "[mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"
                )}
              />
            </div>
          </div>
          <div className="w-full max-w-2xl space-y-4 relative z-10">
            <div className="flex flex-col items-center mb-10">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6">
                <Image
                  src="/logo-no-text.png"
                  alt="potpie.ai"
                  width={24}
                  height={24}
                  className="w-16 h-16 object-contain"
                  priority
                />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Let's cook some ideas!
              </h2>
            </div>

            {/* Input Area */}
            <Card className="relative bg-gray-100 rounded-2xl border border-gray-200 shadow-lg">
              {selectedRepo && selectedRepo !== "connect-repo" && (
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-4 rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                    >
                      <Github className="h-4 w-4 mr-2" />
                      {linkedRepos.find((r) => r.id === selectedRepo)?.name ||
                        "Repository"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRepo("")}
                      className="h-8 px-3 text-gray-500 hover:text-gray-700"
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
              <Textarea
                placeholder={
                  projectId
                    ? "Add any additional context or requirements..."
                    : "Describe your feature idea... (e.g., Integrate payment with stripe.)"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !parsing) {
                    if (
                      projectId &&
                      selectedRepo &&
                      selectedRepo !== "connect-repo"
                    ) {
                      e.preventDefault();
                      handleSelectRepo();
                    } else if (!projectId) {
                      e.preventDefault();
                      handleSend();
                    }
                  }
                }}
                disabled={parsing}
                className="w-full min-h-[140px] max-h-[300px] resize-none bg-transparent border-0 focus:ring-0 focus-visible:ring-0 px-5 pt-5 pb-20 text-base text-gray-900 placeholder:text-gray-500 disabled:opacity-50"
                rows={4}
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedRepo && selectedRepo !== "connect-repo" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                    >
                      <Github className="h-4 w-4 mr-2" />
                      {linkedRepos.find((r) => r.id === selectedRepo)?.name ||
                        "Repository"}
                    </Button>
                  ) : (
                    <Select
                      value={selectedRepo}
                      onValueChange={(value) => {
                        if (value === "connect-repo") {
                          handleConnectRepo();
                        } else {
                          setSelectedRepo(value);
                        }
                      }}
                      disabled={loading || parsing}
                    >
                      <SelectTrigger className="h-9 px-4 rounded-full bg-white border-gray-300 hover:bg-gray-50 text-sm font-medium">
                        <Github className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select repo" />
                      </SelectTrigger>
                      <SelectContent>
                        {linkedRepos.map((repo) => (
                          <SelectItem key={repo.id} value={repo.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{repo.name}</span>
                              <span className="text-xs text-gray-500">
                                {repo.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                        <div className="border-t border-gray-200 my-1" />
                        <SelectItem
                          value="connect-repo"
                          className="text-blue-600 font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <Github className="h-4 w-4" />
                            <span>Connect New Repository</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {!projectId && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full hover:bg-gray-200"
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 rounded-full hover:bg-gray-200 text-gray-600 font-medium"
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-gray-200"
                  >
                    <Mic className="h-4 w-4 text-gray-600" />
                  </Button>
                  <Button
                    onClick={
                      projectId &&
                      selectedRepo &&
                      selectedRepo !== "connect-repo"
                        ? handleSelectRepo
                        : handleSend
                    }
                    disabled={
                      !input.trim() ||
                      loading ||
                      parsing ||
                      !!(
                        projectId &&
                        (!selectedRepo || selectedRepo === "connect-repo")
                      )
                    }
                    size="icon"
                    className="h-10 w-10 rounded-full bg-black hover:bg-black/90 text-white disabled:opacity-50 shadow-md"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <BorderBeam duration={8} size={150} />
            </Card>

            {/* Parsing Status - Below Textarea */}
            {parsing && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">
                    Analyzing repository...
                  </p>
                </div>
                <div className="space-y-1.5 mb-3">
                  {parsingSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${parsingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IdeaPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    }>
      <IdeaPageContent />
    </Suspense>
  );
}
