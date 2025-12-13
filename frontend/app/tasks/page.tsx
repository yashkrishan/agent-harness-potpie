"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { generateTasks, getTasks } from "@/lib/api";
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
  FileCode,
  Sparkles,
  Share2,
  Copy,
  Check,
  Edit,
  Send,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AgentThinking } from "@/components/agent-thinking";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Chatbot } from "@/components/chatbot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Task {
  id: number;
  name: string;
  description: string;
  file_path: string | null;
  status: string;
}

interface Phase {
  id: number;
  name: string;
  description: string;
  status: string;
  tasks: Task[];
}

function TasksPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = parseInt(searchParams.get("projectId") || "0");

  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [chatbotMinimized, setChatbotMinimized] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  useEffect(() => {
    if (selectedPhase && phases.length > 0) {
      const index = phases.findIndex((p) => p.id === selectedPhase.id);
      if (index !== -1) {
        setCarouselIndex(index);
      }
    }
  }, [selectedPhase, phases]);

  const loadTasks = async () => {
    try {
      const existing = await getTasks(projectId);
      if (existing.phases && existing.phases.length > 0) {
        setPhases(existing.phases);
        if (existing.phases.length > 0) {
          setSelectedPhase(existing.phases[0]);
        }
      } else {
        generatePhases();
      }
    } catch {
      generatePhases();
    }
  };

  const generatePhases = async () => {
    setLoading(true);
    setShowThinking(true);
    setProgress(0);
    setCurrentStep("Analyzing Plan...");

    // Simulate task generation process
    const steps = [
      { progress: 10, step: "Breaking down requirements..." },
      { progress: 25, step: "Identifying implementation phases..." },
      { progress: 40, step: "Creating task breakdown..." },
      { progress: 60, step: "Assigning file paths..." },
      { progress: 80, step: "Ordering tasks..." },
      { progress: 95, step: "Finalizing plan..." },
      { progress: 100, step: "Task plan ready!" },
    ];

    for (const { progress: p, step } of steps) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setProgress(p);
      setCurrentStep(step);
    }

    try {
      const result = await generateTasks(projectId);
      setPhases(result.phases);
      if (result.phases.length > 0) {
        setSelectedPhase(result.phases[0]);
      }
    } catch (error) {
      console.error("Failed to generate tasks:", error);
      toast.error("Failed to generate tasks. Please try again.");
    } finally {
      setLoading(false);
      setShowThinking(false);
      setProgress(0);
      setCurrentStep("");
    }
  };

  const handleContinue = () => {
    router.push(`/design?projectId=${projectId}`);
  };

  const generateShareLink = () => {
    // Use environment variable or fallback to potpie.ai
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                   (typeof window !== 'undefined' ? window.location.origin : 'https://potpie.ai');
    return `${baseUrl}/share/plan/${projectId}`;
  };

  const copyShareLink = async () => {
    const link = generateShareLink();
    try {
      await navigator.clipboard.writeText(link);
      setShareLinkCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setShareLinkCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const formatPlanForSharing = () => {
    if (phases.length === 0) return "";

    let planText = "Implementation Plan\n";
    planText += "=".repeat(50) + "\n\n";

    phases.forEach((phase, phaseIdx) => {
      planText += `Phase ${phaseIdx + 1}: ${phase.name}\n`;
      planText += `${phase.description}\n\n`;

      phase.tasks.forEach((task, taskIdx) => {
        planText += `  ${taskIdx + 1}. ${task.name}\n`;
        if (task.description) {
          planText += `     ${task.description}\n`;
        }
        if (task.file_path) {
          planText += `     File: ${task.file_path}\n`;
        }
        planText += "\n";
      });

      planText += "\n";
    });

    return planText;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Main Content with Chatbot */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ marginRight: chatbotMinimized ? '0' : '400px', transition: 'margin-right 0.3s ease' }}>
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-8 py-4 h-[73px]">
          <div className="flex items-center justify-between h-full">
              <div className="flex flex-col justify-center">
              <h1 className="text-xl font-semibold text-gray-900">
                  Phases & Tasks
              </h1>
              <p className="text-sm text-gray-600">
                Review the generated implementation plan
              </p>
            </div>
            {phases.length > 0 && (
              <div className="flex gap-2">
                <Dialog
                  open={shareDialogOpen}
                  onOpenChange={setShareDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-gray-300 hover:bg-gray-50"
                    >
                      <Share2 className="h-4 w-4" />
                      Share Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Share Implementation Plan</DialogTitle>
                      <DialogDescription>
                        Share this plan with your team members or stakeholders
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Share Link
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={generateShareLink()}
                            readOnly
                            className="flex-1 font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={copyShareLink}
                            className="flex-shrink-0"
                          >
                            {shareLinkCopied ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Plan Summary
                        </label>
                        <div className="p-4 bg-muted/50 rounded-lg border border-border/50 max-h-[200px] overflow-y-auto">
                          <div className="space-y-3">
                            <div className="text-sm">
                              <p className="font-semibold mb-2">Overview:</p>
                              <p className="text-muted-foreground">
                                {phases.length} phases with{" "}
                                {phases.reduce(
                                  (acc, p) => acc + p.tasks.length,
                                  0
                                )}{" "}
                                total tasks
                              </p>
                            </div>
                            <div className="text-sm">
                              <p className="font-semibold mb-2">Phases:</p>
                              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {phases.map((phase, idx) => (
                                  <li key={phase.id}>
                                    Phase {idx + 1}: {phase.name} (
                                    {phase.tasks.length} tasks)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={copyShareLink}
                          className="flex-1"
                          variant="default"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const planText = formatPlanForSharing();
                            navigator.clipboard.writeText(planText);
                            toast.success("Plan copied to clipboard!");
                          }}
                          className="flex-1"
                        >
                          Copy Plan Text
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
              </div>
            </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50">
            <div className="max-w-7xl mx-auto space-y-3">
            {loading || showThinking ? (
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="py-12">
                  <div className="space-y-4">
                <AgentThinking 
                  messages={[
                        "Analyzing Plan requirements...",
                    "Breaking down into phases...",
                    "Creating task breakdown...",
                        "Almost ready...",
                  ]}
                />
                {progress > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{currentStep}</span>
                          <span className="text-gray-600">{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
              </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Phases Carousel/Timeline */}
                {phases.length > 0 && (
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <h3 className="font-semibold text-base text-gray-900">
                        Phases Timeline
                  </h3>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    
                    <div className="relative">
                      {/* Carousel Container with proper overflow */}
                      <div className="overflow-hidden rounded-lg">
                        <div
                          className="flex transition-transform duration-300 ease-in-out gap-3"
                          style={{
                            transform: `translateX(-${carouselIndex * (100 / 4)}%)`,
                          }}
                        >
                          {phases.map((phase, idx) => {
                            const cardWidth = `${100 / 4}%`;
                            return (
                      <div
                        key={phase.id}
                                className="flex-shrink-0"
                                style={{ width: `calc(${cardWidth} - 0.75rem)` }}
                              >
                                <div
                                  className={`relative h-full p-4 rounded-xl border cursor-pointer transition-all duration-200 bg-white ${
                          selectedPhase?.id === phase.id 
                                      ? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200"
                                      : "border-gray-200 hover:border-blue-400 hover:bg-gray-50 hover:shadow-md"
                                  }`}
                                  onClick={() => {
                                    setSelectedPhase(phase);
                                    setSelectedTask(null);
                                  }}
                                >
                                  <div className="flex flex-col h-full">
                                    {/* Phase Name with Selected Indicator */}
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <h4 className="font-medium text-xs text-gray-700 line-clamp-2 leading-tight uppercase tracking-wide flex-1">
                                        {phase.name}
                                      </h4>
                                      {selectedPhase?.id === phase.id && (
                                        <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                          <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                        </div>
                                      )}
                                    </div>
                                    
                                    <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-3">
                                      {phase.description}
                                    </p>
                                    
                                    {/* Task Count */}
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto pt-2 border-t border-gray-200">
                                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                      <span className="font-semibold">{phase.tasks.length} tasks</span>
                                    </div>
                                  </div>
                        </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Navigation Arrows */}
                      {phases.length > 4 && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCarouselIndex(Math.max(0, carouselIndex - 1));
                            }}
                            disabled={carouselIndex === 0}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white shadow-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronLeft className="h-5 w-5 text-gray-700" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const maxIndex = Math.max(0, phases.length - 4);
                              setCarouselIndex(Math.min(maxIndex, carouselIndex + 1));
                            }}
                            disabled={carouselIndex >= Math.max(0, phases.length - 4)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-white shadow-lg border border-gray-300 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            <ChevronRight className="h-5 w-5 text-gray-700" />
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Dots Indicator */}
                    {phases.length > 4 && (
                      <div className="flex justify-center gap-2 mt-5">
                        {Array.from({
                          length: Math.ceil(phases.length / 4),
                        }).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetIndex = Math.min(idx, Math.max(0, phases.length - 4));
                              setCarouselIndex(targetIndex);
                            }}
                            className={`rounded-full transition-all duration-300 ${
                              carouselIndex === idx
                                ? "w-8 h-2 bg-blue-600"
                                : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Phase Details Section */}
                {selectedPhase && (
                  <div className="mt-6">
                    <h3 className="font-semibold text-base mb-4 text-gray-900">
                    Phase Details
                  </h3>
                    <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      {/* Phase Header */}
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <h4 className="font-semibold text-sm mb-2 text-gray-900">
                          {selectedPhase.name}
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {selectedPhase.description}
                        </p>
                      </div>
                      
                      {/* Tasks Section */}
                      <div className="space-y-3">
                        <h5 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                            {selectedPhase.tasks.length}
                          </span>
                          Tasks
                        </h5>
                        <div className="space-y-3">
                        {selectedPhase.tasks.map((task, idx) => (
                          <div 
                            key={task.id} 
                              className={`p-4 border rounded-lg transition-all cursor-pointer ${
                                selectedTask?.id === task.id
                                  ? "border-blue-500 bg-blue-50 shadow-sm"
                                  : "border-gray-200 hover:border-blue-400 hover:bg-gray-50 hover:shadow-sm"
                              }`}
                              onClick={() => setSelectedTask(task)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0 space-y-2">
                                  <h6 className="font-semibold text-sm text-gray-900">
                                    {task.name}
                                  </h6>
                                  <p className="text-sm text-gray-600 leading-relaxed">
                                    {task.description}
                                  </p>
                                {task.file_path && (
                                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-gray-50 border border-gray-200 text-xs font-mono">
                                      <FileCode className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                                      <span className="text-gray-600 truncate">
                                        {task.file_path}
                                      </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    </div>
                    </div>
                  )}
              </>
            )}
            </div>
          </div>

          {/* Sticky Continue Button */}
          {phases.length > 0 && !loading && !showThinking && (
            <div className="border-t border-gray-200 bg-white px-3 py-3 sticky bottom-0 z-10">
              <div className="max-w-7xl mx-auto">
              <Button 
                onClick={handleContinue} 
                  className="w-full bg-black hover:bg-black/90 text-white h-9 text-sm"
                size="lg" 
                disabled={phases.length === 0}
              >
                  Generate Implementation Design
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Fixed Chatbot on Right */}
        <Chatbot
          contextLabels={[
            ...(selectedPhase
              ? [
                  {
                    label: "Phase",
                    value: selectedPhase.name,
                    icon: <CheckCircle2 className="h-4 w-4" />,
                  },
                ]
              : []),
            ...(selectedTask
              ? [
                  {
                    label: "Task",
                    value: selectedTask.name,
                    icon: <FileCode className="h-4 w-4" />,
                  },
                ]
              : []),
          ]}
          initialMessage="Hello! I can help you with questions about the selected phase and tasks. Select a phase and task to get started."
          placeholder="Ask a question about the phase or task..."
          onMinimizeChange={setChatbotMinimized}
        />
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    }>
      <TasksPageContent />
    </Suspense>
  );
}
