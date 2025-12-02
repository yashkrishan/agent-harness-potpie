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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { generatePlan, getPlan } from "@/lib/api";
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
  FileText,
  Bot,
  Edit2,
  Save,
  X,
  Sparkles,
  User,
} from "lucide-react";
import { AgentThinking } from "@/components/agent-thinking";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { Chatbot } from "@/components/chatbot";

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

function PlanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = parseInt(searchParams.get("projectId") || "0");

  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [answers, setAnswers] = useState<Map<string, QuestionAnswer>>(
    new Map()
  );
  const [additionalContext, setAdditionalContext] = useState("");
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Map<string, MCQQuestion[]>>(
    new Map()
  );
  const [showAgentThinking, setShowAgentThinking] = useState(true);
  const [chatbotMinimized, setChatbotMinimized] = useState(false);
  const [visibleQuestions, setVisibleQuestions] = useState<Set<string>>(
    new Set()
  );
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await fetch("/plan-mcq-10.txt");
      const text = await response.text();
      const parsed = parseMCQFile(text);
      setQuestions(parsed);

      // Group questions by section
      const sectionMap = new Map<string, MCQQuestion[]>();
      parsed.forEach((q) => {
        if (!sectionMap.has(q.section)) {
          sectionMap.set(q.section, []);
        }
        sectionMap.get(q.section)!.push(q);
      });
      setSections(sectionMap);

      // Initialize answers with agent's assumed values
      const initialAnswers = new Map<string, QuestionAnswer>();
      parsed.forEach((q) => {
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

      setLoading(false);

      // Start typewriter animation
      setIsGenerating(true);
      animateQuestions(parsed);
    } catch (error) {
      console.error("Failed to load questions:", error);
      setLoading(false);
    }
  };

  const animateQuestions = async (allQuestions: MCQQuestion[]) => {
    for (let i = 0; i < allQuestions.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Delay between questions
      setVisibleQuestions(
        (prev) => new Set([...Array.from(prev), allQuestions[i].id])
      );
    }
    setIsGenerating(false);
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

      // Check for section header (A., B., C., etc.)
      const sectionMatch = line.match(/^([A-G])\.\s(.+)$/);
      if (sectionMatch) {
        currentSection = sectionMatch[2];
        continue;
      }

      // Check for question (starts with number)
      const questionMatch = line.match(/^(\d+)\.\s(.+)$/);
      if (questionMatch) {
        questionNumber++;
        const questionText = questionMatch[2];
        const options: string[] = [];
        let needsInput = false;
        let assumed: string | undefined;
        let reasoning: string | undefined;

        // Collect options (A., B., C., etc.)
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

        // Check for notes (➡️)
        if (j < lines.length && lines[j].includes("➡️")) {
          const note = lines[j];
          if (note.includes("Needs input")) {
            needsInput = true;
            // Extract reasoning after "Needs input"
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

  const handleDone = async () => {
    // Collect all answers
    const answerData = Array.from(answers.values()).map((answer) => ({
      questionId: answer.questionId,
      textAnswer: answer.textAnswer,
      mcqAnswer: answer.mcqAnswer,
    }));

    // Generate Plan with answers and additional context
    try {
      await generatePlan(projectId);
      router.push(`/tasks?projectId=${projectId}`);
    } catch (error) {
      console.error("Failed to generate plan:", error);
      toast.error("Failed to generate plan. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

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
          <div className="border-b border-gray-200 bg-white px-4 py-2.5">
            <h1 className="text-base font-semibold text-gray-900">
              Implementation Plan
            </h1>
            <p className="text-xs text-gray-600">
              Review and refine the AI-generated questions
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-6xl mx-auto">
              {/* Grid Layout for Questions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {/* Header - Full Width */}
                <div className="col-span-full mb-2">
                  <Card className="border border-primary/20 bg-gradient-to-br from-card to-card/50">
                    <CardHeader className="pb-2 px-3 pt-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-lg bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-sm">
                              AI Agent Analysis
                            </CardTitle>
                            <CardDescription className="text-[10px]">
                              {isGenerating
                                ? "Generating questions..."
                                : "Review and edit the AI agent's assumptions"}
                            </CardDescription>
                          </div>
                        </div>
                        {isGenerating && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                </div>

                {/* Questions Grid */}
                {Array.from(sections.entries()).map(
                  ([sectionName, sectionQuestions]) =>
                    sectionQuestions.map((question) => {
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

                      return (
                        <Card
                          key={question.id}
                          className={`border transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                            answer.isUserModified
                              ? "bg-blue-500/5 border-blue-500/30"
                              : isAgentAssumed
                              ? "bg-primary/5 border-primary/20"
                              : "bg-muted/30 border-border/50"
                          }`}
                        >
                          <CardContent className="p-2.5">
                            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <h3 className="font-medium text-xs text-foreground leading-tight">
                                    {question.question}
                                  </h3>
                                  {isAgentAssumed && (
                                    <span className="px-1 py-0.5 text-[10px] rounded-full bg-primary/20 text-primary border border-primary/30 whitespace-nowrap">
                                      AI
                                    </span>
                                  )}
                                  {answer.isUserModified && (
                                    <span className="px-1 py-0.5 text-[10px] rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 whitespace-nowrap">
                                      Edited
                                    </span>
                                  )}
                                  {question.needsInput && (
                                    <span className="px-1 py-0.5 text-[10px] rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                                      Input
                                    </span>
                                  )}
                                </div>

                                {/* Agent Reasoning - Compact, Truncated */}
                                {question.reasoning && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">
                                    <Bot className="h-2.5 w-2.5 inline mr-0.5 text-primary" />
                                    {question.reasoning}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEdit(question.id)}
                                className="flex-shrink-0 h-6 w-6 p-0"
                              >
                                {answer.isEditing ? (
                                  <X className="h-2.5 w-2.5" />
                                ) : (
                                  <Edit2 className="h-2.5 w-2.5" />
                                )}
                              </Button>
                            </div>

                            {/* Answer Display/Edit */}
                            {answer.isEditing ? (
                              <div className="space-y-1.5 mt-1.5">
                                <Textarea
                                  placeholder="Type your answer..."
                                  value={answer.textAnswer}
                                  onChange={(e) =>
                                    handleTextAnswerChange(
                                      question.id,
                                      e.target.value
                                    )
                                  }
                                  className="min-h-[50px] text-xs resize-none"
                                />
                                {question.options.length > 0 && (
                                  <RadioGroup
                                    value={answer.mcqAnswer}
                                    onValueChange={(value) =>
                                      handleMCQAnswerChange(question.id, value)
                                    }
                                    className="space-y-0.5"
                                  >
                                    {question.options.map((option, idx) => {
                                      const optionLabel = String.fromCharCode(
                                        65 + idx
                                      );
                                      return (
                                        <div
                                          key={idx}
                                          className={`flex items-center space-x-1.5 p-1.5 rounded border text-[10px] cursor-pointer ${
                                            answer.mcqAnswer === optionLabel
                                              ? "bg-blue-500/20 border-blue-500/50"
                                              : "bg-muted/30 border-border/50"
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
                                            className="h-2.5 w-2.5"
                                          />
                                          <Label
                                            htmlFor={`${question.id}-option-${idx}`}
                                            className="flex-1 cursor-pointer text-[10px] leading-tight"
                                          >
                                            <span className="font-bold text-primary mr-0.5">
                                              {optionLabel}.
                                            </span>
                                            {option}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </RadioGroup>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1.5">
                                {isAgentAssumed &&
                                  question.assumed &&
                                  question.options.length > 0 && (
                                    <div className="p-1.5 rounded bg-primary/10 border border-primary/20 text-[10px] leading-tight">
                                      <span className="font-bold">
                                        {question.assumed}.
                                      </span>{" "}
                                      {
                                        question.options[
                                          question.assumed.charCodeAt(0) - 65
                                        ]
                                      }
                                    </div>
                                  )}
                                {answer.textAnswer && (
                                  <div className="p-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-[10px] leading-tight">
                                    {answer.textAnswer}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                )}

                {/* Additional Context & Done Button - Full Width */}
                <div className="col-span-full mt-2">
                  <Card className="border border-primary/20">
                    <CardHeader className="pb-2 px-3 pt-2.5">
                      <CardTitle className="text-sm">
                        Additional Context
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 px-3 pb-3">
                      <Textarea
                        placeholder="Add any additional context..."
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        className="min-h-[60px] text-xs resize-none"
                      />
                      <Button
                        onClick={handleDone}
                        disabled={isGenerating}
                        className="w-full bg-black hover:bg-black/90"
                        size="sm"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1.5" />
                        Done - Generate Plan
                        <ArrowRight className="h-3 w-3 ml-1.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Chatbot on Right */}
          <Chatbot
            initialMessage="Hello! I can help you with questions about the implementation plan. Review the questions and ask me anything you'd like to clarify."
            placeholder="Ask a question about the plan..."
            onMinimizeChange={setChatbotMinimized}
          />
        </div>
      </div>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    }>
      <PlanPageContent />
    </Suspense>
  );
}
