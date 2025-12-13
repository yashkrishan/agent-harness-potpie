"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { selectRepo, analyzeRepo, generatePlan } from "@/lib/api";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Chatbot } from "@/components/chatbot";
import {
  Bot,
  Sparkles,
  CheckCircle2,
  Edit2,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  FileText,
  Upload,
  Link as LinkIcon,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface MCQQuestion {
  id: string;
  section: string;
  question: string;
  options: string[];
  needsInput: boolean;
  assumed?: string;
  reasoning?: string;
}

interface QuestionAnswer {
  questionId: string;
  textAnswer: string;
  mcqAnswer: string;
  isEditing: boolean;
  isUserModified: boolean;
}

type PageState = "generating-plan" | "questions";

function RepoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = parseInt(searchParams.get("projectId") || "0");

  const [pageState, setPageState] = useState<PageState>("generating-plan");
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [visibleQuestions, setVisibleQuestions] = useState<Set<string>>(
    new Set()
  );
  const [answers, setAnswers] = useState<Map<string, QuestionAnswer>>(
    new Map()
  );
  const [additionalContext, setAdditionalContext] = useState("");
  const [sections, setSections] = useState<Map<string, MCQQuestion[]>>(
    new Map()
  );
  const [hoveredQuestion, setHoveredQuestion] = useState<string | null>(null);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(
    new Set()
  );
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [chatbotMinimized, setChatbotMinimized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatbotMessages, setChatbotMessages] = useState<Array<{role: "user" | "assistant" | "thinking"; content: string}>>([
    {
      role: "assistant",
      content: "Hello! I can help you with questions about the repository analysis and plan generation. Ask me anything about the questions or requirements.",
    },
  ]);
  const [chatbotThinking, setChatbotThinking] = useState(false);
  const questionsEndRef = useRef<HTMLDivElement>(null);

  /**
   * Smart filtering to limit questions to 10-12 maximum
   * Priority:
   * 1. All questions that "need input" (critical, must be included)
   * 2. Distribute remaining slots across sections (round-robin)
   * 3. Within each section, prioritize earlier questions
   */
  const filterQuestions = (allQuestions: MCQQuestion[]): MCQQuestion[] => {
    const MIN_QUESTIONS = 10;
    const MAX_QUESTIONS = 12;

    // Edge case: If we have fewer than MIN, show all
    if (allQuestions.length <= MIN_QUESTIONS) {
      return allQuestions;
    }

    // Step 1: Always include questions that need input (critical)
    const needsInputQuestions = allQuestions.filter((q) => q.needsInput);
    const selectedIds = new Set<string>(needsInputQuestions.map((q) => q.id));
    const selected: MCQQuestion[] = [...needsInputQuestions];

    // Edge case: If "needs input" questions exceed MAX, show all of them
    if (needsInputQuestions.length >= MAX_QUESTIONS) {
      return needsInputQuestions.slice(0, MAX_QUESTIONS);
    }

    // Step 2: Group remaining questions by section
    const remainingBySection = new Map<string, MCQQuestion[]>();
    allQuestions.forEach((q) => {
      if (!selectedIds.has(q.id)) {
        if (!remainingBySection.has(q.section)) {
          remainingBySection.set(q.section, []);
        }
        remainingBySection.get(q.section)!.push(q);
      }
    });

    // Step 3: Round-robin selection across sections to maintain balance
    const sections = Array.from(remainingBySection.keys());
    const sectionQueues = new Map<string, MCQQuestion[]>();
    sections.forEach((section) => {
      sectionQueues.set(section, [...remainingBySection.get(section)!]);
    });

    // Calculate how many more we need
    // Aim for MIN if we're below it, otherwise try to reach MAX
    const targetCount = selected.length < MIN_QUESTIONS 
      ? MIN_QUESTIONS 
      : MAX_QUESTIONS;
    let needed = Math.max(0, targetCount - selected.length);

    // Round-robin: take one question from each section in rotation
    let sectionIndex = 0;
    while (needed > 0 && sections.length > 0) {
      const currentSection = sections[sectionIndex % sections.length];
      const queue = sectionQueues.get(currentSection)!;

      if (queue && queue.length > 0) {
        const question = queue.shift()!;
        selected.push(question);
        selectedIds.add(question.id);
        needed--;
        sectionIndex++;
      } else {
        // Remove empty section and continue
        const removeIndex = sections.indexOf(currentSection);
        if (removeIndex !== -1) {
          sections.splice(removeIndex, 1);
          sectionQueues.delete(currentSection);
        }
        if (sections.length === 0) break;
        // Adjust index if we removed a section before current position
        if (removeIndex < sectionIndex) {
          sectionIndex--;
        }
        if (sectionIndex < 0) sectionIndex = 0;
      }
    }

    // Sort selected questions to maintain original order within sections
    return selected
      .sort((a, b) => {
        const aIndex = allQuestions.findIndex((q) => q.id === a.id);
        const bIndex = allQuestions.findIndex((q) => q.id === b.id);
        return aIndex - bIndex;
      })
      .slice(0, MAX_QUESTIONS);
  };

  const parseMCQFile = (text: string): MCQQuestion[] => {
    const questions: MCQQuestion[] = [];
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let currentSection = "";
    let questionNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const sectionMatch = line.match(/^([A-Z])\.\s(.+)$/);
      if (sectionMatch) {
        currentSection = sectionMatch[2];
        continue;
      }

      const questionMatch = line.match(/^(\d+)\.\s(.+)$/);
      if (questionMatch) {
        questionNumber++;
        const questionText = questionMatch[2];
        const options: string[] = [];
        let needsInput = false;
        let assumed: string | undefined;
        let reasoning: string | undefined;

        let j = i + 1;
        while (j < lines.length) {
          const optionMatch = lines[j].match(/^([A-E])\.\s(.+)$/);
          if (optionMatch) {
            options.push(optionMatch[2]);
            j++;
          } else {
            break;
          }
        }

        if (j < lines.length && lines[j].includes("➡️")) {
          const note = lines[j];
          if (note.includes("Needs input")) {
            needsInput = true;
            const reasoningMatch = note.match(
              /Needs input\s*(?:\(|—)?(.+?)(?:\)|$)/
            );
            if (reasoningMatch) {
              reasoning = reasoningMatch[1].trim();
            }
          } else if (note.includes("Assumed:")) {
            const assumedMatch = note.match(
              /Assumed:\s*([A-E])\s*(?:\([^)]+\))?\s*—\s*(.+)$/
            );
            if (assumedMatch) {
              assumed = assumedMatch[1];
              reasoning = assumedMatch[2].trim();
            } else {
              const simpleMatch = note.match(/Assumed:\s*([A-E])/);
              if (simpleMatch) {
                assumed = simpleMatch[1];
              }
            }
          }
          j++;
        }

        questions.push({
          id: `q${questionNumber}`,
          section: currentSection,
          question: questionText,
          options,
          needsInput,
          assumed,
          reasoning,
        });

        i = j - 1;
      }
    }

    return questions;
  };

  const loadQuestions = async () => {
    try {
      // Show thinking state in chatbot
      setChatbotThinking(true);
      setChatbotMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm analyzing the repository and generating context-specific questions for your fraud detection implementation plan.",
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      setChatbotMessages((prev) => [
        ...prev,
        {
          role: "thinking",
          content: "Processing requirements and identifying key decision points...",
        },
      ]);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fetch with cache to speed up subsequent loads
      const response = await fetch("/plan-mcq.txt", {
        cache: "force-cache",
      });
      const text = await response.text();
      const allParsed = parseMCQFile(text);
      
      // Filter to 10-12 questions max
      const filtered = filterQuestions(allParsed);
      setQuestions(filtered);

      const sectionMap = new Map<string, MCQQuestion[]>();
      filtered.forEach((q) => {
        if (!sectionMap.has(q.section)) {
          sectionMap.set(q.section, []);
        }
        sectionMap.get(q.section)!.push(q);
      });
      setSections(sectionMap);

      const initialAnswers = new Map<string, QuestionAnswer>();
      filtered.forEach((q) => {
        initialAnswers.set(q.id, {
          questionId: q.id,
          textAnswer:
            q.assumed && q.options.length > 0
              ? q.options[q.assumed.charCodeAt(0) - 65]
              : "",
          mcqAnswer: q.assumed || "",
          isEditing: false,
          isUserModified: false,
        });
      });
      setAnswers(initialAnswers);

      // Update chatbot with question generation - remove thinking message and add result
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setChatbotMessages((prev) => {
        const withoutThinking = prev.filter((msg) => msg.role !== "thinking");
        return [
          ...withoutThinking,
          {
            role: "assistant",
            content: `I've generated ${filtered.length} key questions covering system architecture, fraud scoring, integration design, edge cases, and checkout service specifics. Review and refine them as needed!`,
          },
        ];
      });
      setChatbotThinking(false);
      
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Show questions immediately in batches for better UX
      setPageState("questions");
      setIsGenerating(true);
      animateQuestions(filtered);
    } catch (error) {
      console.error("Failed to load questions:", error);
      setIsGenerating(false);
      setChatbotThinking(false);
      setChatbotMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an error while generating questions. Please try again.",
        },
      ]);
    }
  };

  const animateQuestions = async (allQuestions: MCQQuestion[]) => {
    // Show first batch after a short delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    const firstBatch = allQuestions.slice(0, 5);
    setVisibleQuestions(new Set(firstBatch.map(q => q.id)));
    
    // Update chatbot as questions appear
    if (firstBatch.length > 0) {
      setChatbotMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `📋 Questions are being prepared...`,
        },
      ]);
    }
    
    // Show remaining questions in batches with delays
    for (let i = 5; i < allQuestions.length; i += 3) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const batch = allQuestions.slice(i, i + 3);
      setVisibleQuestions((prev) => {
        const newSet = new Set(prev);
        batch.forEach(q => newSet.add(q.id));
        return newSet;
      });

      // Update chatbot with progress (vague messages)
      if (batch.length > 0) {
        const progressMessages = [
          "📋 Continuing to prepare questions...",
          "📋 Almost there...",
          "📋 Finalizing questions...",
        ];
        const messageIndex = Math.floor((i - 5) / 3) % progressMessages.length;
        setChatbotMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: progressMessages[messageIndex],
          },
        ]);
      }

      // Auto-scroll to latest question
      setTimeout(() => {
        questionsEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
    
    // Final message when all questions are shown
    await new Promise((resolve) => setTimeout(resolve, 500));
    setChatbotMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `✅ All questions are ready! You can hover over any question to edit it.`,
      },
    ]);
    
    setIsGenerating(false);
  };

  useEffect(() => {
    // Auto-start question generation when page loads (repo already selected in idea page)
    if (projectId && pageState === "generating-plan") {
      // Start loading immediately without delay
      loadQuestions();
    }
  }, [projectId, pageState]);

  const handleTextAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const current = newAnswers.get(questionId) || {
        questionId,
        textAnswer: "",
        mcqAnswer: "",
        isEditing: false,
        isUserModified: false,
      };
      newAnswers.set(questionId, {
        ...current,
        textAnswer: value,
        isUserModified: true,
      });
      return newAnswers;
    });
  };

  const handleMCQAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const current = newAnswers.get(questionId) || {
        questionId,
        textAnswer: "",
        mcqAnswer: "",
        isEditing: false,
        isUserModified: false,
      };
      const question = questions.find((q) => q.id === questionId);
      const optionText = question?.options[value.charCodeAt(0) - 65] || "";
      newAnswers.set(questionId, {
        ...current,
        mcqAnswer: value,
        textAnswer: optionText,
        isUserModified: true,
      });
      return newAnswers;
    });
  };

  const toggleEdit = (questionId: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const current = newAnswers.get(questionId) || {
        questionId,
        textAnswer: "",
        mcqAnswer: "",
        isEditing: false,
        isUserModified: false,
      };
      newAnswers.set(questionId, { ...current, isEditing: !current.isEditing });
      return newAnswers;
    });
  };

  const handleSave = (questionId: string) => {
    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const current = newAnswers.get(questionId);
      if (current) {
        newAnswers.set(questionId, { ...current, isEditing: false });
      }
      return newAnswers;
    });
  };

  const handleCancel = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    setAnswers((prev) => {
      const newAnswers = new Map(prev);
      const current = newAnswers.get(questionId);
      if (current) {
        // Reset to original answer if not user modified
        const originalAnswer =
          question.assumed && question.options.length > 0
            ? question.options[question.assumed.charCodeAt(0) - 65]
            : "";
        newAnswers.set(questionId, {
          ...current,
          isEditing: false,
          textAnswer: current.isUserModified
            ? current.textAnswer
            : originalAnswer,
          mcqAnswer: current.isUserModified
            ? current.mcqAnswer
            : question.assumed || "",
        });
      }
      return newAnswers;
    });
  };

  const toggleOptions = (questionId: string) => {
    setExpandedOptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleAddLink = () => {
    if (linkUrl.trim()) {
      setAdditionalContext((prev) =>
        prev ? `${prev}\n\nLink: ${linkUrl.trim()}` : `Link: ${linkUrl.trim()}`
      );
      toast.success("Link added!");
      setLinkUrl("");
      setLinkDialogOpen(false);
    }
  };

  const handleDone = async () => {
    try {
      await generatePlan(projectId);
      router.push(`/tasks?projectId=${projectId}`);
    } catch (error) {
      console.error("Failed to generate plan:", error);
      toast.error("Failed to generate plan. Please try again.");
    }
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
          <div className="flex flex-col justify-center h-full">
            <h1 className="text-xl font-semibold text-gray-900">
              Implementation Plan
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Review and refine the AI-generated questions
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Questions Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="max-w-5xl mx-auto space-y-3">
            {/* Question Generation Status */}
            {(pageState === "generating-plan" || pageState === "questions") && (
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader className="pb-2 px-3 pt-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-primary/10">
                      <Bot
                        className={`h-4 w-4 text-primary ${
                          pageState === "generating-plan" || isGenerating ? "animate-pulse" : ""
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-sm">
                        {pageState === "generating-plan" || isGenerating
                          ? "Generating Plan Context"
                          : "Plan Context Generated"}
                      </CardTitle>
                      <CardDescription className="text-[10px]">
                        {pageState === "generating-plan" || isGenerating
                          ? "AI agent is analyzing requirements and generating questions..."
                          : "Questions are ready for review"}
                      </CardDescription>
                    </div>
                    {(pageState === "generating-plan" || isGenerating) && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-2.5">
                  {pageState === "generating-plan" || isGenerating ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                        <span className="text-xs text-muted-foreground">
                          Preparing questions...
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">
                        Questions generated successfully
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Questions Section */}
            {pageState === "questions" && (
              <>
                {/* Agent Thinking Banner */}
                <Card className="border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded-lg bg-primary/20">
                        <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-primary mb-1">
                          AI Agent Analysis
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          The AI agent has analyzed your requirements and made
                          assumptions for each question. Hover over any question
                          to edit. Questions marked with "Needs input" require
                          your confirmation.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Questions by Section */}
                <div className="space-y-3">
                  {Array.from(sections.entries()).map(
                    ([sectionName, sectionQuestions]) => (
                      <Card
                        key={sectionName}
                        className="border border-primary/20 bg-gradient-to-br from-card to-card/50 shadow-sm"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <div className="w-1 h-4 bg-primary rounded-full" />
                            {sectionName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2.5">
                          {sectionQuestions.map((question) => {
                            if (!visibleQuestions.has(question.id)) {
                              return null;
                            }

                            const answer = answers.get(question.id) || {
                              questionId: question.id,
                              textAnswer: "",
                              mcqAnswer: "",
                              isEditing: false,
                              isUserModified: false,
                            };
                            const isAgentAssumed =
                              question.assumed && !answer.isUserModified;
                            const isHovered = hoveredQuestion === question.id;

                            return (
                              <div
                                key={question.id}
                                onMouseEnter={() =>
                                  setHoveredQuestion(question.id)
                                }
                                onMouseLeave={() => setHoveredQuestion(null)}
                                className={`p-3 rounded-lg border transition-all animate-in slide-in-from-bottom fade-in duration-300 ${
                                  answer.isUserModified
                                    ? "bg-blue-500/5 border-blue-500/30"
                                    : isAgentAssumed
                                    ? "bg-primary/5 border-primary/20"
                                    : "bg-muted/30 border-border/50"
                                } ${isHovered ? "shadow-md" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                                      <h3 className="font-medium text-sm text-foreground leading-tight">
                                        {question.question}
                                      </h3>
                                      {isAgentAssumed && (
                                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary border border-primary/30 whitespace-nowrap font-medium">
                                          AI
                                        </span>
                                      )}
                                      {answer.isUserModified && (
                                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-600 border border-blue-500/30 whitespace-nowrap font-medium">
                                          Edited
                                        </span>
                                      )}
                                      {question.needsInput && (
                                        <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-600 border border-yellow-500/30 whitespace-nowrap font-medium">
                                          Input
                                        </span>
                                      )}
                                    </div>

                                    {/* Agent Reasoning - Truncated */}
                                    {question.reasoning && (
                                      <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                                        <Bot className="h-3 w-3 inline mr-0.5 text-primary" />
                                        {question.reasoning}
                                      </p>
                                    )}
                                  </div>
                                  {isHovered && !answer.isEditing && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleEdit(question.id)}
                                      className="flex-shrink-0 h-7 w-7 p-0 animate-in fade-in slide-in-from-right"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>

                                {/* Answer Display/Edit */}
                                {answer.isEditing ? (
                                  <div className="space-y-2">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                                        <Bot className="h-3.5 w-3.5" />
                                        Your Answer
                                      </Label>
                                      <Textarea
                                        placeholder="Type your answer here..."
                                        value={answer.textAnswer}
                                        onChange={(e) =>
                                          handleTextAnswerChange(
                                            question.id,
                                            e.target.value
                                          )
                                        }
                                        className="min-h-[60px] text-sm resize-none"
                                      />
                                    </div>

                                    {question.options.length > 0 && (
                                      <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">
                                          Or select an option:
                                        </Label>
                                        <RadioGroup
                                          value={answer.mcqAnswer}
                                          onValueChange={(value) =>
                                            handleMCQAnswerChange(
                                              question.id,
                                              value
                                            )
                                          }
                                          className="space-y-1.5"
                                        >
                                          {question.options.map(
                                            (option, idx) => {
                                              const optionLabel =
                                                String.fromCharCode(65 + idx);
                                              return (
                                                <div
                                                  key={idx}
                                                  className={`flex items-center space-x-2 p-2 rounded-md border text-xs transition-all cursor-pointer ${
                                                    answer.mcqAnswer ===
                                                    optionLabel
                                                      ? "bg-blue-500/20 border-blue-500/50 shadow-sm"
                                                      : "bg-muted/30 border-border/50 hover:bg-muted/50 hover:border-blue-500/30"
                                                  }`}
                                                  onClick={() =>
                                                    handleMCQAnswerChange(
                                                      question.id,
                                                      optionLabel
                                                    )
                                                  }
                                                >
                                                  <RadioGroupItem
                                                    value={optionLabel}
                                                    id={`${question.id}-option-${idx}`}
                                                    className="h-3.5 w-3.5"
                                                  />
                                                  <Label
                                                    htmlFor={`${question.id}-option-${idx}`}
                                                    className="flex-1 cursor-pointer text-xs leading-relaxed"
                                                  >
                                                    <span className="font-bold text-primary mr-1">
                                                      {optionLabel}.
                                                    </span>
                                                    <span className="text-foreground">
                                                      {option}
                                                    </span>
                                                  </Label>
                                                </div>
                                              );
                                            }
                                          )}
                                        </RadioGroup>
                                      </div>
                                    )}

                                    {/* Save and Cancel Buttons */}
                                    <div className="flex gap-2 pt-1">
                                      <Button
                                        onClick={() => handleSave(question.id)}
                                        className="flex-1"
                                        size="sm"
                                      >
                                        <Save className="h-3.5 w-3.5 mr-1.5" />
                                        Save
                                      </Button>
                                      <Button
                                        onClick={() =>
                                          handleCancel(question.id)
                                        }
                                        variant="outline"
                                        className="flex-1"
                                        size="sm"
                                      >
                                        <X className="h-3.5 w-3.5 mr-1.5" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {(answer.textAnswer ||
                                      (isAgentAssumed && question.assumed)) && (
                                      <div
                                        className={`p-2 rounded-md border ${
                                          answer.isUserModified
                                            ? "bg-blue-500/10 border-blue-500/20"
                                            : "bg-primary/10 border-primary/20"
                                        }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <Bot
                                            className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                                              answer.isUserModified
                                                ? "text-blue-600"
                                                : "text-primary"
                                            }`}
                                          />
                                          <div className="flex-1">
                                            <p className="text-xs text-foreground leading-relaxed">
                                              {answer.textAnswer ||
                                                (question.assumed &&
                                                question.options.length > 0
                                                  ? `${question.assumed}. ${
                                                      question.options[
                                                        question.assumed.charCodeAt(
                                                          0
                                                        ) - 65
                                                      ]
                                                    }`
                                                  : "")}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Collapsible Options */}
                                    {question.options.length > 0 && (
                                      <div className="space-y-1.5">
                                        <button
                                          onClick={() =>
                                            toggleOptions(question.id)
                                          }
                                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full font-medium"
                                        >
                                          {expandedOptions.has(question.id) ? (
                                            <ChevronUp className="h-3.5 w-3.5" />
                                          ) : (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                          )}
                                          <span>
                                            {expandedOptions.has(question.id)
                                              ? "Hide options"
                                              : "Show options"}
                                          </span>
                                        </button>
                                        {expandedOptions.has(question.id) && (
                                          <div className="space-y-1.5 animate-in slide-in-from-top fade-in">
                                            {question.options.map(
                                              (option, idx) => {
                                                const optionLabel =
                                                  String.fromCharCode(65 + idx);
                                                const isSelected =
                                                  answer.mcqAnswer ===
                                                    optionLabel ||
                                                  (isAgentAssumed &&
                                                    question.assumed ===
                                                      optionLabel);
                                                return (
                                                  <div
                                                    key={idx}
                                                    className={`p-2 rounded-md border text-xs leading-relaxed ${
                                                      isSelected
                                                        ? "bg-primary/10 border-primary/30 text-primary font-medium"
                                                        : "bg-muted/30 border-border/50 text-foreground"
                                                    }`}
                                                  >
                                                    <span className="font-bold mr-1">
                                                      {optionLabel}.
                                                    </span>
                                                    {option}
                                                  </div>
                                                );
                                              }
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {!answer.textAnswer && !isAgentAssumed && (
                                      <div className="p-2 rounded-md bg-muted/50 border border-border/50 text-center">
                                        <p className="text-xs text-muted-foreground">
                                          Hover to edit
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>

                <div ref={questionsEndRef} />
              </>
            )}
            </div>
          </div>

          {/* Sticky Additional Context & Done Button */}
          {visibleQuestions.size === questions.length && pageState === "questions" && (
            <div className="border-t border-gray-200 bg-white px-6 py-4 sticky bottom-0 z-10">
              <div className="max-w-5xl mx-auto">
                <Card className="border border-primary/20 bg-gradient-to-br from-card to-card/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Additional Context
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Add any additional context, requirements, or notes here
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Textarea
                        placeholder="Add any additional context, requirements, or notes here..."
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        className="min-h-[80px] text-sm resize-none pr-20"
                      />
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                        <button
                          onClick={() =>
                            toast.info("Notion file upload coming soon!")
                          }
                          className="w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-all"
                          type="button"
                        >
                          <FileText className="h-3.5 w-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".pdf";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (file) {
                                toast.success(
                                  `PDF file selected: ${file.name}`
                                );
                              }
                            };
                            input.click();
                          }}
                          className="w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-all"
                          type="button"
                        >
                          <Upload className="h-3.5 w-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => setLinkDialogOpen(true)}
                          className="w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-all"
                          type="button"
                        >
                          <LinkIcon className="h-3.5 w-3.5 text-primary" />
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={handleDone}
                      disabled={isGenerating}
                      className="w-full bg-black hover:bg-black/90 h-10"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Generate Implementation Plan
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Link Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Link</DialogTitle>
              <DialogDescription>
                Enter a URL to add as additional context
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddLink();
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setLinkDialogOpen(false);
                  setLinkUrl("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddLink} disabled={!linkUrl.trim()}>
                Add Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>

        {/* Fixed Chatbot on Right */}
        <Chatbot
          initialMessage="Hello! I can help you with questions about the repository analysis and plan generation. Ask me anything about the questions or requirements."
          placeholder="Ask a question about the repository or plan..."
          onMinimizeChange={setChatbotMinimized}
          externalMessages={chatbotMessages}
          isThinking={chatbotThinking}
        />
      </div>
    </div>
  );
}

export default function RepoPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    }>
      <RepoPageContent />
    </Suspense>
  );
}
