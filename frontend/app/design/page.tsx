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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  generateDesign,
  getDesign,
  getTasks,
} from "@/lib/api";
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
  Network,
  Sparkles,
  FileText,

  Code,
  Database,
  Webhook,
  ArrowRightLeft,
  Hash,
  Table,
  List,
  GitBranch,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AgentThinking } from "@/components/agent-thinking";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Chatbot } from "@/components/chatbot";
import { Tree, File, Folder, type TreeViewElement } from "@/components/ui/file-tree";

interface Phase {
  id: number;
  name: string;
  description: string;
  tasks: any[];
}

function DesignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = parseInt(searchParams.get("projectId") || "0");

  const [phases, setPhases] = useState<Phase[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [design, setDesign] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [activeTab, setActiveTab] = useState("architecture");
  const [affectedFiles, setAffectedFiles] = useState<string[]>([]);
  const [chatbotMinimized, setChatbotMinimized] = useState(false);
  const [mainViewTab, setMainViewTab] = useState<"design" | "files">("design");
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    loadPhases();
  }, [projectId]);

  useEffect(() => {
    if (selectedPhaseId) {
      loadDesign();
      loadAffectedFiles();
    }
  }, [selectedPhaseId]);

  useEffect(() => {
    // Auto-scroll carousel to selected phase when phases are loaded
    if (selectedPhaseId && phases.length > 0) {
      const phaseIndex = phases.findIndex((p) => p.id === selectedPhaseId);
      if (phaseIndex !== -1) {
        setCarouselIndex(Math.floor(phaseIndex / Math.min(phases.length, 4)));
      }
    }
  }, [selectedPhaseId, phases]);

  const loadAffectedFiles = async () => {
    if (!selectedPhaseId) return;
    try {
      const result = await getTasks(projectId);
      const selectedPhase = result.phases.find(
        (p: Phase) => p.id === selectedPhaseId
      );
      if (selectedPhase) {
        // Extract unique file paths from tasks
        const files = selectedPhase.tasks
          .map((task: any) => task.file_path)
          .filter((path: string | null) => path !== null && path !== undefined);
        setAffectedFiles(files);
      }
    } catch (error) {
      console.error("Failed to load affected files:", error);
      setAffectedFiles([]);
    }
  };

  const loadPhases = async () => {
    try {
      const result = await getTasks(projectId);
      // Deduplicate phases by phase_number to avoid duplicates
      const uniquePhases = result.phases.reduce(
        (acc: Phase[], phase: Phase) => {
          const existing = acc.find(
            (p) => (p as any).phase_number === (phase as any).phase_number
          );
          if (!existing) {
            acc.push(phase);
          }
          return acc;
        },
        []
      );
      // Sort by phase_number
      uniquePhases.sort(
        (a: any, b: any) => (a.phase_number || 0) - (b.phase_number || 0)
      );
      setPhases(uniquePhases);
      if (uniquePhases.length > 0 && !selectedPhaseId) {
        setSelectedPhaseId(uniquePhases[0].id);
      }
    } catch (error) {
      console.error("Failed to load phases:", error);
    }
  };

  const loadDesign = async () => {
    if (!selectedPhaseId) return;
    setLoading(true);
    setGenerating(true);
    setShowThinking(true);
    setProgress(0);
    setCurrentStep("Loading design...");
    
    try {
      const result = await getDesign(selectedPhaseId);
      setDesign(result);
      setGenerating(false);
      setShowThinking(false);
    } catch {
      // Design doesn't exist, generate it automatically
      setCurrentStep("Starting design generation...");
      
      const steps = [
        { progress: 15, step: "Analyzing phase requirements..." },
        { progress: 30, step: "Designing architecture..." },
        { progress: 45, step: "Creating UML diagrams..." },
        { progress: 60, step: "Defining API structure..." },
        { progress: 75, step: "Planning database changes..." },
        { progress: 90, step: "Documenting data flow..." },
        { progress: 100, step: "Design complete!" },
      ];

      for (const { progress: p, step } of steps) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        setProgress(p);
        setCurrentStep(step);
      }

      try {
        const result = await generateDesign(selectedPhaseId);
        setDesign(result);
      } catch (error) {
        console.error("Failed to generate design:", error);
        toast.error("Failed to generate design. Please try again.");
        setDesign(null);
      }
    } finally {
      setLoading(false);
      setGenerating(false);
      setShowThinking(false);
      setProgress(0);
      setCurrentStep("");
    }
  };


  const selectedPhase = phases.find((p) => p.id === selectedPhaseId);

  // Convert files to TreeViewElement structure
  const buildFileTree = (files: string[]): TreeViewElement[] => {
    const tree: { [key: string]: TreeViewElement } = {};

    files.forEach((filePath) => {
      const parts = filePath.split("/");
      let currentPath = "";
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const pathKey = currentPath ? `${currentPath}/${part}` : part;
        
        if (!tree[pathKey]) {
          if (isFile) {
            tree[pathKey] = {
              id: pathKey,
              name: part,
              isSelectable: true,
            };
          } else {
            tree[pathKey] = {
              id: pathKey,
              name: part,
              isSelectable: true,
              children: [],
            };
          }
        }
        
        if (!isFile && currentPath) {
          const parent = tree[currentPath];
          if (parent && parent.children) {
            const existingChild = parent.children.find(c => c.id === pathKey);
            if (!existingChild) {
              parent.children.push(tree[pathKey]);
            }
          }
        }
        
        currentPath = pathKey;
      });
    });

    // Return root level items (items without parents in the tree)
    return Object.values(tree).filter(item => {
      const hasParent = files.some(filePath => {
        const parts = filePath.split("/");
        if (parts.length <= 1) return false;
        const parentPath = parts.slice(0, -1).join("/");
        return filePath.startsWith(parentPath + "/") && filePath !== item.id;
      });
      const itemParts = item.id.split("/");
      return !hasParent || itemParts.length === 1;
    });
  };

  // Build file tree structure for Tree component
  const buildFileTreeSimple = (files: string[]): TreeViewElement[] => {
    const tree: { [key: string]: TreeViewElement } = {};
    
    files.forEach((filePath) => {
      const parts = filePath.split("/");
      let currentPath = "";
      
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const pathKey = currentPath ? `${currentPath}/${part}` : part;
        
        if (!tree[pathKey]) {
          if (isFile) {
            tree[pathKey] = {
              id: pathKey,
              name: part,
              isSelectable: true,
            };
          } else {
            tree[pathKey] = {
              id: pathKey,
              name: part,
              isSelectable: true,
              children: [],
            };
          }
        }
        
        // Link to parent
        if (currentPath && tree[currentPath] && tree[currentPath].children) {
          const existingChild = tree[currentPath].children!.find(c => c.id === pathKey);
          if (!existingChild) {
            tree[currentPath].children!.push(tree[pathKey]);
          }
        }
        
        currentPath = pathKey;
      });
    });

    // Return root level items (items that are not children of other items)
    const rootItems: TreeViewElement[] = [];
    const allChildIds = new Set<string>();
    
    Object.values(tree).forEach(item => {
      if (item.children) {
        item.children.forEach(child => allChildIds.add(child.id));
      }
    });
    
    Object.values(tree).forEach(item => {
      if (!allChildIds.has(item.id)) {
        rootItems.push(item);
      }
    });
    
    // Sort: folders first, then files, both alphabetically
    const sortTree = (items: TreeViewElement[]): TreeViewElement[] => {
      return items.sort((a, b) => {
        if (a.children && !b.children) return -1;
        if (!a.children && b.children) return 1;
        return a.name.localeCompare(b.name);
      }).map(item => ({
        ...item,
        children: item.children ? sortTree(item.children) : undefined,
      }));
    };
    
    return sortTree(rootItems);
  };

  const fileTreeElements = buildFileTreeSimple(affectedFiles);

  // Recursive component to render tree
  const renderTree = (elements: TreeViewElement[]): React.ReactNode => {
    return elements.map((element) => {
      if (element.children && element.children.length > 0) {
        return (
          <Folder
            key={element.id}
            value={element.id}
            element={element.name}
            isSelectable={element.isSelectable}
          >
            {renderTree(element.children)}
          </Folder>
        );
      } else {
        return (
          <File
            key={element.id}
            value={element.id}
            isSelectable={element.isSelectable}
          >
            {element.name}
          </File>
        );
      }
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Main Content with Chatbot */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        {/* Main Content Area */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            marginRight: chatbotMinimized ? "0" : "400px",
            transition: "margin-right 0.3s ease",
          }}
        >
          {/* Header */}
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  System Design
                </h1>
                <p className="text-sm text-gray-600">
                  Review and refine the system architecture
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
            {/* Phases Carousel */}
            <div className="w-full flex-shrink-0 bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Network className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-semibold text-xs text-gray-900">
                  Phases
                </span>
              </div>
              
              {phases.length > 0 && (
                <div className="relative">
                  <div className="relative overflow-hidden">
                    {/* Carousel Container */}
                    <div
                      className="flex transition-transform duration-500 ease-in-out"
                      style={{
                        transform: `translateX(-${carouselIndex * (100 / Math.min(phases.length, 4))}%)`,
                      }}
                    >
                      {phases.map((phase, idx) => (
                        <div
                          key={phase.id}
                          className="flex-shrink-0 px-1"
                          style={{ width: `${100 / Math.min(phases.length, 4)}%` }}
                        >
                          <div
                            className={`relative p-2 rounded-md border cursor-pointer transition-all duration-300 bg-white ${
                              selectedPhaseId === phase.id
                                ? "border-blue-500 bg-blue-50 shadow-sm scale-[1.02] ring-1 ring-blue-200"
                                : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                            }`}
                            onClick={() => {
                              setSelectedPhaseId(phase.id);
                              setCarouselIndex(Math.floor(idx / Math.min(phases.length, 4)));
                            }}
                          >
                            <div className="flex items-start gap-1.5">
                              {/* Phase Number Badge */}
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                                {idx + 1}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                {/* Selected Indicator */}
                                {selectedPhaseId === phase.id && (
                                  <div className="flex items-center justify-end mb-0.5">
                                    <div className="w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center">
                                      <CheckCircle2 className="h-2 w-2 text-white" />
                                    </div>
                                  </div>
                                )}
                                
                                <h4 className="font-semibold text-xs text-gray-900 mb-0.5 line-clamp-1 leading-tight">
                                  {phase.name}
                                </h4>
                                <p className="text-[10px] text-gray-600 mb-1 leading-tight line-clamp-1">
                                  {phase.description}
                                </p>
                              </div>
                            </div>
                            
                            {/* Progress Line */}
                            {idx < phases.length - 1 && (
                              <div className="absolute top-1/2 -right-1 w-2 h-0.5 bg-gray-300 z-0 transform -translate-y-1/2">
                                <div
                                  className={`h-full bg-blue-600 transition-all duration-500 ${
                                    idx < carouselIndex * Math.min(phases.length, 4) ? "w-full" : "w-0"
                                  }`}
                                ></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Navigation Arrows */}
                    {phases.length > 4 && (
                      <>
                        <button
                          onClick={() => {
                            setCarouselIndex(Math.max(0, carouselIndex - 1));
                          }}
                          disabled={carouselIndex === 0}
                          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => {
                            setCarouselIndex(
                              Math.min(
                                Math.ceil(phases.length / Math.min(phases.length, 4)) - 1,
                                carouselIndex + 1
                              )
                            );
                          }}
                          disabled={
                            carouselIndex >=
                            Math.ceil(phases.length / Math.min(phases.length, 4)) - 1
                          }
                          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-700" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* Dots Indicator */}
                  {phases.length > 4 && (
                    <div className="flex justify-center gap-1 mt-1.5">
                      {Array.from({
                        length: Math.ceil(phases.length / Math.min(phases.length, 4)),
                      }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCarouselIndex(idx);
                          }}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            carouselIndex === idx
                              ? "w-4 bg-blue-600"
                              : "w-1 bg-gray-300 hover:bg-gray-400"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Main Content Area with Tabs */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab Selector */}
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <Tabs value={mainViewTab} onValueChange={(v) => setMainViewTab(v as "design" | "files")} className="w-full">
                  <TabsList className="w-auto">
                    <TabsTrigger value="design" className="px-6">
                      Design
                    </TabsTrigger>
                    <TabsTrigger value="files" className="px-6">
                      Affected Files
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden flex flex-col">
                {mainViewTab === "design" ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-6 overflow-y-auto shadow-sm h-full">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : design ? (
                <div className="space-y-6">
                  {/* Document Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                    <FileText className="h-6 w-6 text-primary" />
                    <h1 className="text-2xl font-bold">Design Document</h1>
                    {selectedPhase && (
                      <span className="text-sm text-muted-foreground">
                        - {selectedPhase.name}
                      </span>
                    )}
                  </div>

                  {/* Content Tabs */}
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                  >
                    <TabsList className="flex w-full bg-muted/50 border border-border/50 p-1 gap-1">
                      <TabsTrigger value="architecture" className="flex-1 px-4 py-2.5 text-sm font-medium">
                        Architecture
                      </TabsTrigger>
                      <TabsTrigger value="sequence" className="flex-1 px-4 py-2.5 text-sm font-medium">
                        Sequence
                      </TabsTrigger>
                      <TabsTrigger value="api" className="flex-1 px-4 py-2.5 text-sm font-medium">
                        API
                      </TabsTrigger>
                      <TabsTrigger value="database" className="flex-1 px-4 py-2.5 text-sm font-medium">
                        Database
                      </TabsTrigger>
                      <TabsTrigger value="data-flow" className="flex-1 px-4 py-2.5 text-sm font-medium">
                        Data Flow
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="architecture" className="mt-4">
                      <div className="space-y-4">
                        {design.architecture ? (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                              <Network className="h-5 w-5 text-primary" />
                              <h2 className="text-lg font-semibold">System Architecture</h2>
                            </div>
                            <div className="prose prose-invert max-w-none">
                              <ReactMarkdown
                                  components={{
                                    code: ({
                                      node,
                                      inline,
                                      className,
                                      children,
                                      ...props
                                    }: any) => {
                                      if (inline) {
                                        return (
                                          <code className="bg-muted/50 px-2 py-1 rounded text-sm font-mono text-primary">
                                            {children}
                                          </code>
                                        );
                                      }

                                      const match = /language-(\w+)/.exec(
                                        className || ""
                                      );
                                      const isMermaid =
                                        match && match[1] === "mermaid";

                                      if (isMermaid) {
                                        const mermaidCode = String(children)
                                          .replace(/\n$/, "")
                                          .trim();
                                        return (
                                          <div className="my-6 w-full overflow-x-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <MermaidDiagram
                                              chart={mermaidCode}
                                            />
                                          </div>
                                        );
                                      }

                                      return (
                                        <pre className="bg-muted/30 p-4 rounded-lg overflow-x-auto border border-border/50">
                                          <code
                                            className={className}
                                            {...props}
                                          >
                                            {children}
                                          </code>
                                        </pre>
                                      );
                                    },
                                    p: ({ children }) => (
                                      <p className="mb-3 text-foreground/90 leading-relaxed">
                                        {children}
                                      </p>
                                    ),
                                    h1: ({ children }) => (
                                      <h1 className="text-2xl font-bold mb-4 text-foreground">
                                        {children}
                                      </h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="text-xl font-semibold mb-3 mt-6 text-foreground flex items-center gap-2">
                                        {children}
                                      </h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground">
                                        {children}
                                      </h3>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-outside mb-4 space-y-2 text-foreground/90 ml-6">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-outside mb-4 space-y-2 text-foreground/90 ml-6">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="pl-2 leading-relaxed">
                                        {children}
                                      </li>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-foreground">
                                        {children}
                                      </strong>
                                    ),
                                  }}
                                >
                                  {design.architecture}
                                </ReactMarkdown>
                              </div>
                            </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                            <Network className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">
                              No architecture diagram available
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="sequence" className="mt-4">
                      <div className="space-y-4">
                        {design.sequence_diagram ? (
                          <div className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                              <GitBranch className="h-5 w-5 text-primary" />
                              <h2 className="text-lg font-semibold">Sequence Diagram</h2>
                            </div>
                            <div>
                              {(() => {
                                // Check if sequence_diagram starts with "sequenceDiagram" (plain text format)
                                const seqDiagram =
                                  design.sequence_diagram.trim();
                                const isPlainSequence =
                                  seqDiagram.startsWith("sequenceDiagram");

                                if (isPlainSequence) {
                                  // Render directly as Mermaid diagram without markdown
                                  return (
                                    <div className="w-full overflow-x-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
                                      <MermaidDiagram chart={seqDiagram} />
                                    </div>
                                  );
                                }

                                // Otherwise, render as markdown (which may contain mermaid code blocks)
                                return (
                                  <div className="prose prose-invert max-w-none">
                                    <ReactMarkdown
                                      components={{
                                        code: ({
                                          node,
                                          inline,
                                          className,
                                          children,
                                          ...props
                                        }: any) => {
                                          if (inline) {
                                            return (
                                              <code className="bg-muted/50 px-2 py-1 rounded text-sm font-mono text-primary">
                                                {children}
                                              </code>
                                            );
                                          }

                                          const match = /language-(\w+)/.exec(
                                            className || ""
                                          );
                                          const isMermaid =
                                            match && match[1] === "mermaid";

                                          if (isMermaid) {
                                            const mermaidCode = String(children)
                                              .replace(/\n$/, "")
                                              .trim();
                                            return (
                                              <div className="my-6 w-full overflow-x-auto bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <MermaidDiagram
                                                  chart={mermaidCode}
                                                />
                                              </div>
                                            );
                                          }

                                          return (
                                            <pre className="bg-muted/30 p-4 rounded-lg overflow-x-auto border border-border/50">
                                              <code
                                                className={className}
                                                {...props}
                                              >
                                                {children}
                                              </code>
                                            </pre>
                                          );
                                        },
                                        p: ({ children }) => (
                                          <p className="mb-3 text-foreground/90 leading-relaxed">
                                            {children}
                                          </p>
                                        ),
                                        h1: ({ children }) => (
                                          <h1 className="text-2xl font-bold mb-4 text-foreground">
                                            {children}
                                          </h1>
                                        ),
                                        h2: ({ children }) => (
                                          <h2 className="text-xl font-semibold mb-3 mt-6 text-foreground">
                                            {children}
                                          </h2>
                                        ),
                                        h3: ({ children }) => (
                                          <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground">
                                            {children}
                                          </h3>
                                        ),
                                        ul: ({ children }) => (
                                          <ul className="list-disc list-inside mb-4 space-y-2 text-foreground/90">
                                            {children}
                                          </ul>
                                        ),
                                        ol: ({ children }) => (
                                          <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground/90">
                                            {children}
                                          </ol>
                                        ),
                                        li: ({ children }) => (
                                          <li className="ml-4">{children}</li>
                                        ),
                                        strong: ({ children }) => (
                                          <strong className="font-semibold text-foreground">
                                            {children}
                                          </strong>
                                        ),
                                      }}
                                    >
                                      {design.sequence_diagram}
                                    </ReactMarkdown>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                            <GitBranch className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">
                              No sequence diagram available
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="api" className="mt-6">
                      <div className="space-y-4">
                        {design.api_structure ? (
                          typeof design.api_structure === "string" ? (
                            <div className="bg-muted/50 p-6 rounded-xl border-2 border-border/50">
                              <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                                {design.api_structure}
                              </pre>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {Object.entries(design.api_structure).map(
                                ([key, value]: [string, any]) => (
                                  <Card
                                    key={key}
                                    className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50"
                                  >
                                    <CardHeader>
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                          <Webhook className="h-5 w-5 text-primary" />
                                        </div>
                                        <CardTitle className="text-lg capitalize">
                                          {key.replace(/_/g, " ")}
                                        </CardTitle>
                                      </div>
                                    </CardHeader>
                                    <CardContent>
                                      {Array.isArray(value) ? (
                                        <div className="space-y-3">
                                          {value.map(
                                            (item: any, idx: number) => (
                                              <div
                                                key={idx}
                                                className="p-4 rounded-lg bg-muted/30 border border-border/50"
                                              >
                                                {typeof item === "object" ? (
                                                  <div className="space-y-2">
                                                    {Object.entries(item).map(
                                                      ([k, v]: [
                                                        string,
                                                        any
                                                      ]) => (
                                                        <div
                                                          key={k}
                                                          className="flex items-start gap-3"
                                                        >
                                                          <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                          <div className="flex-1">
                                                            <span className="font-semibold text-sm text-primary">
                                                              {k}:
                                                            </span>
                                                            <span className="ml-2 text-sm">
                                                              {typeof v ===
                                                              "object"
                                                                ? JSON.stringify(
                                                                    v,
                                                                    null,
                                                                    2
                                                                  )
                                                                : String(v)}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      )
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="text-sm">
                                                    {String(item)}
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      ) : typeof value === "object" ? (
                                        <pre className="bg-muted/30 p-4 rounded-lg overflow-x-auto font-mono text-sm border border-border/50">
                                          {JSON.stringify(value, null, 2)}
                                        </pre>
                                      ) : (
                                        <div className="text-sm">
                                          {String(value)}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                )
                              )}
                            </div>
                          )
                        ) : (
                          <Card className="border-2 border-border/50">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                              <Webhook className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                              <p className="text-muted-foreground">
                                No API structure available
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="database" className="mt-6">
                      <div className="space-y-4">
                        {design.db_changes ? (
                          typeof design.db_changes === "string" ? (
                            <div className="bg-muted/50 p-6 rounded-xl border-2 border-border/50">
                              <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                                {design.db_changes}
                              </pre>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {design.db_changes.tables &&
                              Array.isArray(design.db_changes.tables) ? (
                                design.db_changes.tables.map(
                                  (table: any, idx: number) => (
                                    <Card
                                      key={idx}
                                      className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50"
                                    >
                                      <CardHeader>
                                        <div className="flex items-center gap-3">
                                          <div className="p-2 rounded-lg bg-primary/10">
                                            <Table className="h-5 w-5 text-primary" />
                                          </div>
                                          <CardTitle className="text-lg">
                                            {table.name || `Table ${idx + 1}`}
                                          </CardTitle>
                                        </div>
                                      </CardHeader>
                                      <CardContent>
                                        {table.columns &&
                                        Array.isArray(table.columns) ? (
                                          <div className="space-y-2">
                                            <div className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                              <List className="h-4 w-4" />
                                              Columns
                                            </div>
                                            <div className="grid gap-2">
                                              {table.columns.map(
                                                (
                                                  column: string,
                                                  colIdx: number
                                                ) => {
                                                  const parts =
                                                    column.split("(");
                                                  const colName =
                                                    parts[0].trim();
                                                  const colType = parts[1]
                                                    ? parts[1]
                                                        .replace(")", "")
                                                        .trim()
                                                    : "";
                                                  const isPrimaryKey =
                                                    column
                                                      .toLowerCase()
                                                      .includes("pk") ||
                                                    column
                                                      .toLowerCase()
                                                      .includes("primary");
                                                  const isForeignKey =
                                                    column
                                                      .toLowerCase()
                                                      .includes("fk") ||
                                                    column
                                                      .toLowerCase()
                                                      .includes("foreign");
                                                  return (
                                                    <div
                                                      key={colIdx}
                                                      className={`p-3 rounded-lg border ${
                                                        isPrimaryKey
                                                          ? "bg-primary/10 border-primary/30"
                                                          : isForeignKey
                                                          ? "bg-blue-500/10 border-blue-500/30"
                                                          : "bg-muted/30 border-border/50"
                                                      }`}
                                                    >
                                                      <div className="flex items-center gap-2">
                                                        <Database
                                                          className={`h-4 w-4 ${
                                                            isPrimaryKey
                                                              ? "text-primary"
                                                              : isForeignKey
                                                              ? "text-blue-400"
                                                              : "text-muted-foreground"
                                                          }`}
                                                        />
                                                        <span className="font-mono text-sm font-semibold">
                                                          {colName}
                                                        </span>
                                                        {colType && (
                                                          <span className="text-xs text-muted-foreground">
                                                            ({colType})
                                                          </span>
                                                        )}
                                                        {isPrimaryKey && (
                                                          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                                                            PK
                                                          </span>
                                                        )}
                                                        {isForeignKey && (
                                                          <span className="ml-auto text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                                            FK
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-muted-foreground">
                                            No columns defined
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  )
                                )
                              ) : (
                                <pre className="bg-muted/50 p-6 rounded-xl border-2 border-border/50 overflow-x-auto font-mono text-sm">
                                  {JSON.stringify(design.db_changes, null, 2)}
                                </pre>
                              )}
                            </div>
                          )
                        ) : (
                          <Card className="border-2 border-border/50">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                              <Database className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                              <p className="text-muted-foreground">
                                No database changes available
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="data-flow" className="mt-6">
                      <div className="space-y-4">
                        {design.data_flow ? (
                          <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50">
                            <CardHeader>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                                </div>
                                <CardTitle className="text-lg">
                                  Data Flow
                                </CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="prose prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    h1: ({ children }) => (
                                      <h1 className="text-2xl font-bold mb-4 text-foreground">
                                        {children}
                                      </h1>
                                    ),
                                    h2: ({ children }) => (
                                      <h2 className="text-xl font-semibold mb-3 mt-6 text-foreground">
                                        {children}
                                      </h2>
                                    ),
                                    h3: ({ children }) => (
                                      <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground">
                                        {children}
                                      </h3>
                                    ),
                                    p: ({ children }) => (
                                      <p className="mb-3 text-foreground/90 leading-relaxed">
                                        {children}
                                      </p>
                                    ),
                                    ul: ({ children }) => (
                                      <ul className="list-disc list-outside mb-4 space-y-2 text-foreground/90 ml-6">
                                        {children}
                                      </ul>
                                    ),
                                    ol: ({ children }) => (
                                      <ol className="list-decimal list-outside mb-4 space-y-2 text-foreground/90 ml-6">
                                        {children}
                                      </ol>
                                    ),
                                    li: ({ children }) => (
                                      <li className="pl-2 leading-relaxed">
                                        {children}
                                      </li>
                                    ),
                                    code: ({ children }) => (
                                      <code className="bg-muted/50 px-2 py-1 rounded text-sm font-mono text-primary">
                                        {children}
                                      </code>
                                    ),
                                    strong: ({ children }) => (
                                      <strong className="font-semibold text-foreground">
                                        {children}
                                      </strong>
                                    ),
                                  }}
                                >
                                  {design.data_flow}
                                </ReactMarkdown>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="border-2 border-border/50">
                            <CardContent className="flex flex-col items-center justify-center py-12">
                              <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                              <p className="text-muted-foreground">
                                No data flow description available
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                      <AgentThinking
                        messages={[
                          "Analyzing phase requirements...",
                          "Designing architecture...",
                          "Creating diagrams...",
                          "Almost ready...",
                        ]}
                      />
                      {progress > 0 && (
                        <div className="w-full max-w-md space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {currentStep}
                            </span>
                            <span className="text-muted-foreground">
                              {progress}%
                            </span>
                          </div>
                          <Progress value={progress} />
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm h-full flex flex-col">
                      {/* Files Tree */}
                      <div className="flex-1 overflow-y-auto">
                        {affectedFiles.length === 0 ? (
                          <div className="text-center text-muted-foreground text-sm py-8">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No files affected in this phase</p>
                          </div>
                        ) : (
                          <Tree
                            elements={fileTreeElements}
                            className="h-full"
                            initialExpandedItems={fileTreeElements.map(el => el.id)}
                          >
                            {renderTree(fileTreeElements)}
                          </Tree>
                        )}
                      </div>

                      {/* File Count */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="text-xs text-muted-foreground text-center">
                          {affectedFiles.length} file
                          {affectedFiles.length !== 1 ? "s" : ""} will be affected
                        </div>
                      </div>
                    </div>
                  )}
              </div>

              {/* Sticky Start Execution Button */}
              {selectedPhaseId && (
                <div className="border-t border-gray-200 bg-white px-4 py-4 sticky bottom-0 z-10 flex-shrink-0">
                  <Button
                    onClick={() =>
                      router.push(`/execution?projectId=${projectId}`)
                    }
                    className="w-full bg-black hover:bg-black/90"
                    size="lg"
                  >
                    Start Execution
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Fixed Chatbot on Right */}
      <Chatbot
        contextLabels={
          selectedPhase
            ? [
                {
                  label: "Phase",
                  value: selectedPhase.name,
                  icon: <CheckCircle2 className="h-4 w-4" />,
                },
              ]
            : []
        }
        initialMessage="Hello! I can help you with questions about the system design. Select a phase to see its design details."
        placeholder="Ask a question about the design..."
        onMinimizeChange={setChatbotMinimized}
      />
    </div>
  );
}

export default function DesignPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    }>
      <DesignPageContent />
    </Suspense>
  );
}
