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
import { Progress } from "@/components/ui/progress";
import {
  startExecution,
  executionCommand,
  getExecutionLogs,
  getExecutionStatus,
  getTasks,
} from "@/lib/api";
import {
  Play,
  Pause,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  Sparkles,
  FileCode,
  GitBranch,
  Terminal,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AgentThinking } from "@/components/agent-thinking";
import { Sidebar } from "@/components/sidebar";
import { MonacoDiff } from "@/components/monaco-diff";
import {
  Tree,
  File,
  Folder,
  type TreeViewElement,
} from "@/components/ui/file-tree";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  name: string;
  status: string;
  file_path: string | null;
  description?: string;
  code_changes?: string;
}

interface Phase {
  id: number;
  name: string;
  tasks: Task[];
}

interface ExecutionLog {
  id: number;
  task_id: number | null;
  log_type: string;
  content: string;
  created_at: string;
}

// Hardcoded demo code changes
const DEMO_CODE_CHANGES: Record<string, { before: string; after: string }> = {
  "services/fraud_detection_service.py": {
    before: `from typing import Dict, Optional
from models.transaction import Transaction

class FraudDetectionService:
    """Main service for fraud detection"""
    
    def analyze_transaction(self, transaction_data: Dict) -> Dict:
        # TODO: Implement fraud detection
        pass`,
    after: `from typing import Dict, Optional
from models.transaction import Transaction
from services.fraud_scorer import FraudScorer
from services.decision_engine import DecisionEngine
import logging

logger = logging.getLogger(__name__)

class FraudDetectionService:
    """Main service for fraud detection pipeline"""
    
    def __init__(self):
        self.scorer = FraudScorer()
        self.decision_engine = DecisionEngine()
    
    async def analyze_transaction(self, transaction_data: Dict) -> Dict:
        """Analyze a transaction for fraud
        
        Args:
            transaction_data: Transaction information including card, amount, location, etc.
            
        Returns:
            Dict with fraud_score, risk_level, decision, and reason
        """
        logger.info(f"Analyzing transaction: {transaction_data.get('transaction_id')}")
        
        # Calculate fraud score using heuristics
        fraud_score = await self.scorer.calculate_score(transaction_data)
        
        # Make decision based on score
        decision_result = self.decision_engine.make_decision(fraud_score, transaction_data)
        
        return {
            "fraud_score": fraud_score,
            "risk_level": decision_result["risk_level"],
            "decision": decision_result["decision"],
            "reason": decision_result["reason"]
        }`,
  },
  "models/transaction.py": {
    before: `from sqlalchemy import Column, String, Float

class Transaction:
    id: str
    amount: float`,
    after: `from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    card_last_four = Column(String(4), nullable=False)
    merchant_name = Column(String, nullable=True)
    transaction_type = Column(String, nullable=False)
    location = Column(JSON, nullable=True)
    fraud_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)
    decision = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)`,
  },
  "services/fraud_scorer.py": {
    before: `# Fraud scoring service
class FraudScorer:
    pass`,
    after: `from typing import Dict
import logging

logger = logging.getLogger(__name__)

class FraudScorer:
    """Service for calculating fraud scores using heuristics"""
    
    def __init__(self):
        self.velocity_threshold = 5  # transactions per minute
        self.amount_threshold = 10000  # USD
        self.distance_threshold = 1000  # km
    
    async def calculate_score(self, transaction_data: Dict) -> float:
        """Calculate fraud score based on multiple heuristics
        
        Returns:
            Score between 0-100, higher = more suspicious
        """
        score = 0.0
        
        # Heuristic 1: Unusual amount
        amount = transaction_data.get("amount", 0)
        if amount > self.amount_threshold:
            score += 30
            logger.warning(f"High amount transaction: {amount}")
        
        # Heuristic 2: Velocity check
        velocity = transaction_data.get("velocity", 0)
        if velocity > self.velocity_threshold:
            score += 25
            logger.warning(f"High velocity detected: {velocity} transactions/min")
        
        # Heuristic 3: Location anomaly
        distance = transaction_data.get("distance_from_last", 0)
        if distance > self.distance_threshold:
            score += 20
            logger.warning(f"Large distance: {distance}km from last transaction")
        
        # Heuristic 4: Card age
        card_age_days = transaction_data.get("card_age_days", 365)
        if card_age_days < 30:
            score += 15
            logger.warning(f"New card detected: {card_age_days} days old")
        
        # Heuristic 5: Time of day
        hour = transaction_data.get("hour", 12)
        if hour < 6 or hour > 22:
            score += 10
            logger.info(f"Unusual time: {hour}:00")
        
        return min(score, 100.0)`,
  },
};

// Generate logs for a task
const generateTaskLogs = (
  taskId: number,
  taskName: string,
  filePath: string | null
): ExecutionLog[] => {
  const logs: ExecutionLog[] = [
    {
      id: taskId * 100 + 1,
      task_id: taskId,
      log_type: "agent_message",
      content: `🚀 Starting task: ${taskName}`,
      created_at: new Date().toISOString(),
    },
    {
      id: taskId * 100 + 2,
      task_id: taskId,
      log_type: "agent_message",
      content: `📋 Analyzing requirements for: ${taskName}`,
      created_at: new Date().toISOString(),
    },
    {
      id: taskId * 100 + 3,
      task_id: taskId,
      log_type: "agent_message",
      content: `💻 Generating code implementation...`,
      created_at: new Date().toISOString(),
    },
  ];

  if (filePath) {
    logs.push(
      {
        id: taskId * 100 + 4,
        task_id: taskId,
        log_type: "agent_message",
        content: `📁 Preparing file: ${filePath}`,
        created_at: new Date().toISOString(),
      },
      {
        id: taskId * 100 + 5,
        task_id: taskId,
        log_type: "agent_message",
        content: `✍️ Writing code to ${filePath}...`,
        created_at: new Date().toISOString(),
      },
      {
        id: taskId * 100 + 6,
        task_id: taskId,
        log_type: "code_change",
        content: `✅ Code written successfully to ${filePath}`,
        created_at: new Date().toISOString(),
      }
    );
  }

  logs.push({
    id: taskId * 100 + 7,
    task_id: taskId,
    log_type: "agent_message",
    content: `✨ Task completed: ${taskName}`,
    created_at: new Date().toISOString(),
  });

  return logs;
};

function ExecutionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = parseInt(searchParams.get("projectId") || "0");

  const [phases, setPhases] = useState<Phase[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hasStartedExecution, setHasStartedExecution] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeEditorWidth, setCodeEditorWidth] = useState(40); // percentage
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const executingRef = useRef(false);
  const phaseTasksContainerRef = useRef<HTMLDivElement>(null);
  const activeTaskRef = useRef<HTMLDivElement | null>(null);
  const taskExecutionRef = useRef<{
    currentTasks: Set<number>;
    completedTasks: Set<number>;
    allTasks: Array<{ id: number; name: string; file_path: string | null }>;
    taskIndex: number;
    paused: boolean;
  }>({
    currentTasks: new Set(),
    completedTasks: new Set(),
    allTasks: [],
    taskIndex: 0,
    paused: false,
  });

  // Load tasks only once on mount or when projectId changes
  useEffect(() => {
    loadTasks();
  }, [projectId]);

  // Load status periodically - keep loading even after execution completes
  useEffect(() => {
    loadStatus();
    const interval = setInterval(() => {
      loadStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Check if user is at bottom of scroll container
  const checkIfAtBottom = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        logsContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      shouldAutoScroll.current = isAtBottom;
    }
  };

  // Initialize scroll detection on mount
  useEffect(() => {
    if (logsContainerRef.current) {
      // Don't auto-scroll on initial mount - let user stay where they are
      shouldAutoScroll.current = false;
    }
  }, []);

  useEffect(() => {
    // Only auto-scroll if user is at bottom - scroll within container only
    if (shouldAutoScroll.current && logsContainerRef.current) {
      setTimeout(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop =
            logsContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [logs]);

  // Auto-scroll to active task when phases update
  useEffect(() => {
    if (phases.length > 0 && phaseTasksContainerRef.current) {
      // Find the first in-progress task
      const inProgressTask = phases
        .flatMap((phase) => phase.tasks)
        .find((task) => task.status === "in_progress");

      if (inProgressTask) {
        setTimeout(() => {
          if (phaseTasksContainerRef.current) {
            const taskElement = phaseTasksContainerRef.current.querySelector(
              `[data-task-id="${inProgressTask.id}"]`
            ) as HTMLElement;

            if (taskElement) {
              activeTaskRef.current = taskElement as HTMLDivElement;
              taskElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });
            }
          }
        }, 200);
      }
    }
  }, [phases]);

  const loadTasks = async () => {
    try {
      const result = await getTasks(projectId);

      if (!result.phases || result.phases.length === 0) {
        return;
      }

      // Deduplicate phases by id and sort by phase_number if available
      const phaseMap = new Map<number, Phase>();
      result.phases.forEach((phase: Phase) => {
        // Only add if not already in map
        if (!phaseMap.has(phase.id)) {
          phaseMap.set(phase.id, phase);
        }
      });

      const uniquePhases = Array.from(phaseMap.values()).sort((a, b) => {
        // Sort by phase_number if available, otherwise by id
        const aNum = (a as any).phase_number || a.id;
        const bNum = (b as any).phase_number || b.id;
        return aNum - bNum;
      });

      // Always set unique phases, but merge with existing task statuses if available
      setPhases((prevPhases) => {
        // Deduplicate existing phases first
        const prevPhaseMap = new Map<number, Phase>();
        prevPhases.forEach((phase) => {
          if (!prevPhaseMap.has(phase.id)) {
            prevPhaseMap.set(phase.id, phase);
          }
        });

        // If we have existing phases, merge task statuses from them
        if (prevPhaseMap.size > 0) {
          const mergedPhases = uniquePhases.map((newPhase) => {
            const existingPhase = prevPhaseMap.get(newPhase.id);
            if (existingPhase) {
              // Merge: use new phase data but keep existing task statuses
              const existingTaskMap = new Map(
                existingPhase.tasks.map((t) => [t.id, t])
              );
              const mergedTasks = newPhase.tasks.map((newTask) => {
                const existingTask = existingTaskMap.get(newTask.id);
                return existingTask
                  ? { ...newTask, status: existingTask.status }
                  : newTask;
              });
              return { ...newPhase, tasks: mergedTasks };
            }
            return newPhase;
          });
          // Final deduplication before returning
          const finalPhaseMap = new Map<number, Phase>();
          mergedPhases.forEach((phase) => {
            if (!finalPhaseMap.has(phase.id)) {
              finalPhaseMap.set(phase.id, phase);
            }
          });
          return Array.from(finalPhaseMap.values()).sort((a, b) => {
            const aNum = (a as any).phase_number || a.id;
            const bNum = (b as any).phase_number || b.id;
            return aNum - bNum;
          });
        }
        return uniquePhases;
      });

      // Auto-select first completed task with file_path
      if (!selectedFile && uniquePhases) {
        const firstTaskWithFile = uniquePhases
          .flatMap((p) => p.tasks)
          .find((t) => t.status === "completed" && t.file_path);
        if (firstTaskWithFile?.file_path) {
          setSelectedFile(firstTaskWithFile.file_path);
          setShowCodeEditor(true);
        }
      }
    } catch (error) {
      console.error("Failed to load tasks:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const result = await getExecutionLogs(projectId);
      setLogs(result.logs || []);
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  };

  const loadStatus = async () => {
    try {
      const result = await getExecutionStatus(projectId);
      setStatus(result);
      // Only update executing state if we haven't manually completed execution
      // This prevents the API from overriding our local completion state
      if (executingRef.current) {
        setExecuting(result?.running || false);
      }
    } catch (error) {
      console.error("Failed to load status:", error);
    }
  };

  const updateTaskStatus = (taskId: number, newStatus: string) => {
    setPhases((prevPhases) => {
      // Deduplicate phases first
      const phaseMap = new Map<number, Phase>();
      prevPhases.forEach((phase) => {
        if (!phaseMap.has(phase.id)) {
          phaseMap.set(phase.id, phase);
        }
      });

      const uniquePhases = Array.from(phaseMap.values());

      return uniquePhases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        ),
      }));
    });

    // Scroll to active task if it's in progress
    if (newStatus === "in_progress") {
      setTimeout(() => {
        scrollToActiveTask(taskId);
      }, 100);
    }
  };

  const scrollToActiveTask = (taskId: number) => {
    if (phaseTasksContainerRef.current) {
      // Find the task element
      const taskElement = phaseTasksContainerRef.current.querySelector(
        `[data-task-id="${taskId}"]`
      ) as HTMLElement;

      if (taskElement) {
        activeTaskRef.current = taskElement as HTMLDivElement;
        // Scroll the task into view with smooth behavior
        taskElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }
    }
  };

  const executeTask = async (
    taskId: number,
    taskName: string,
    filePath: string | null
  ) => {
    // Mark task as in progress
    updateTaskStatus(taskId, "in_progress");
    taskExecutionRef.current.currentTasks.add(taskId);

    // Generate logs for this task
    const taskLogs = generateTaskLogs(taskId, taskName, filePath);

    // Add logs with delays to simulate work
    for (let i = 0; i < taskLogs.length; i++) {
      // Check if execution was stopped
      if (!executingRef.current) {
        // Mark task as pending if stopped mid-execution
        updateTaskStatus(taskId, "pending");
        taskExecutionRef.current.currentTasks.delete(taskId);
        return;
      }

      // Wait for pause to be released
      while (taskExecutionRef.current.paused && executingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Check if stopped during pause wait
      if (!executingRef.current) {
        updateTaskStatus(taskId, "pending");
        taskExecutionRef.current.currentTasks.delete(taskId);
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1200 + Math.random() * 800)
      );

      // Check if stopped during delay
      if (!executingRef.current) {
        updateTaskStatus(taskId, "pending");
        taskExecutionRef.current.currentTasks.delete(taskId);
        return;
      }

      // Check pause again before adding log
      while (taskExecutionRef.current.paused && executingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Final check before adding log
      if (!executingRef.current) {
        updateTaskStatus(taskId, "pending");
        taskExecutionRef.current.currentTasks.delete(taskId);
        return;
      }

      const log = {
        ...taskLogs[i],
        id: Date.now() + taskId * 1000 + i,
        created_at: new Date().toISOString(),
      };
      setLogs((prev) => [...prev, log]);
    }

    // Wait for pause to be released before completing
    while (taskExecutionRef.current.paused && executingRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Check if stopped before completing
    if (!executingRef.current) {
      updateTaskStatus(taskId, "pending");
      taskExecutionRef.current.currentTasks.delete(taskId);
      return;
    }

    // Mark task as completed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Final check before marking as completed
    if (!executingRef.current) {
      updateTaskStatus(taskId, "pending");
      taskExecutionRef.current.currentTasks.delete(taskId);
      return;
    }

    updateTaskStatus(taskId, "completed");
    taskExecutionRef.current.currentTasks.delete(taskId);
    taskExecutionRef.current.completedTasks.add(taskId);
  };

  const handleStart = async () => {
    setStarting(true);
    setLogs([]);

    // Don't auto-scroll when execution starts - let user stay where they are
    shouldAutoScroll.current = false;

    // Initialize execution state
    const allTasks = phases.flatMap((phase) =>
      phase.tasks
        .filter((t) => t.status === "pending")
        .map((t) => ({
          id: t.id,
          name: t.name,
          file_path: t.file_path,
        }))
    );

    taskExecutionRef.current = {
      currentTasks: new Set(),
      completedTasks: new Set(),
      allTasks,
      taskIndex: 0,
      paused: false,
    };

    // Add initial log
    setLogs([
      {
        id: Date.now(),
        task_id: null,
        log_type: "agent_message",
        content: "🚀 Starting execution...",
        created_at: new Date().toISOString(),
      },
      {
        id: Date.now() + 1,
        task_id: null,
        log_type: "agent_message",
        content: `📋 Initializing fraud detection pipeline (${allTasks.length} tasks)`,
        created_at: new Date().toISOString(),
      },
    ]);

    // Simulate startup animation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setStarting(false);
    setExecuting(true);
    setHasStartedExecution(true);
    executingRef.current = true;

    try {
      await startExecution(projectId);

      // Execute tasks with concurrency (2 tasks at a time)
      const executeNextBatch = async () => {
        while (
          taskExecutionRef.current.taskIndex <
            taskExecutionRef.current.allTasks.length &&
          executingRef.current
        ) {
          // Check if paused
          while (taskExecutionRef.current.paused && executingRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Check if stopped
          if (!executingRef.current) {
            break;
          }

          // Start up to 2 tasks concurrently
          const tasksToStart: Array<{
            id: number;
            name: string;
            file_path: string | null;
          }> = [];

          while (
            tasksToStart.length < 2 &&
            taskExecutionRef.current.taskIndex <
              taskExecutionRef.current.allTasks.length &&
            taskExecutionRef.current.currentTasks.size < 2
          ) {
            const task =
              taskExecutionRef.current.allTasks[
                taskExecutionRef.current.taskIndex
              ];
            tasksToStart.push(task);
            taskExecutionRef.current.taskIndex++;
          }

          if (tasksToStart.length === 0) {
            break;
          }

          // Execute tasks concurrently
          const promises = tasksToStart.map((task) =>
            executeTask(task.id, task.name, task.file_path)
          );

          await Promise.all(promises);

          // Check if paused before next batch
          while (taskExecutionRef.current.paused && executingRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          // Check if stopped before next batch
          if (!executingRef.current) {
            break;
          }

          // Small delay before starting next batch
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // All tasks completed - set executing to false
        if (executingRef.current) {
          executingRef.current = false;
          setExecuting(false);
          setLogs((prev) => [
            ...prev,
            {
              id: Date.now(),
              task_id: null,
              log_type: "agent_message",
              content: "✅ All tasks completed successfully!",
              created_at: new Date().toISOString(),
            },
          ]);
        }
      };

      executeNextBatch();
    } catch (error) {
      console.error("Failed to start execution:", error);
      executingRef.current = false;
      setExecuting(false);
      setStarting(false);
      setHasStartedExecution(false);
    }
  };

  const handlePause = async () => {
    if (paused) {
      // Resume
      setPaused(false);
      taskExecutionRef.current.paused = false;
      executingRef.current = true;
      try {
        await executionCommand(projectId, "play");
      } catch (error) {
        console.error("Failed to resume:", error);
      }
    } else {
      // Pause
      setPaused(true);
      taskExecutionRef.current.paused = true;
      try {
        await executionCommand(projectId, "pause");
      } catch (error) {
        console.error("Failed to pause:", error);
      }
    }
  };

  const handleStop = async () => {
    try {
      // Stop execution immediately
      executingRef.current = false;
      taskExecutionRef.current.paused = false;
      setExecuting(false);
      setPaused(false);
      setHasStartedExecution(false);

      // Add a stop log
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now(),
          task_id: null,
          log_type: "agent_message",
          content: "⏹️ Execution stopped by user",
          created_at: new Date().toISOString(),
        },
      ]);

      // Reset any in-progress tasks to pending
      taskExecutionRef.current.currentTasks.forEach((taskId) => {
        updateTaskStatus(taskId, "pending");
      });
      taskExecutionRef.current.currentTasks.clear();

      await executionCommand(projectId, "stop");
      if (logIntervalRef.current) {
        clearInterval(logIntervalRef.current);
        logIntervalRef.current = null;
      }
    } catch (error) {
      console.error("Failed to stop:", error);
    }
  };

  const handleContinue = () => {
    router.push(`/testing?projectId=${projectId}`);
  };

  const getStatusIcon = (taskStatus: string) => {
    switch (taskStatus) {
      case "completed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
      case "in_progress":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
      case "failed":
        return <XCircle className="h-3.5 w-3.5 text-red-600" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  const getCodeChange = (filePath: string | null) => {
    if (!filePath) return null;
    return DEMO_CODE_CHANGES[filePath] || null;
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
          const existingChild = tree[currentPath].children!.find(
            (c) => c.id === pathKey
          );
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

    Object.values(tree).forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => allChildIds.add(child.id));
      }
    });

    Object.values(tree).forEach((item) => {
      if (!allChildIds.has(item.id)) {
        rootItems.push(item);
      }
    });

    // Sort: folders first, then files, both alphabetically
    const sortTree = (items: TreeViewElement[]): TreeViewElement[] => {
      return items
        .sort((a, b) => {
          if (a.children && !b.children) return -1;
          if (!a.children && b.children) return 1;
          return a.name.localeCompare(b.name);
        })
        .map((item) => ({
          ...item,
          children: item.children ? sortTree(item.children) : undefined,
        }));
    };

    return sortTree(rootItems);
  };

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
            className="text-[#cccccc] hover:text-white hover:bg-[#2d2d30] px-2 py-1.5 rounded-md transition-colors [&_svg]:text-[#4ec9b0]"
          >
            {renderTree(element.children)}
          </Folder>
        );
      } else {
        const isSelected = selectedFile === element.id;
        return (
          <File
            key={element.id}
            value={element.id}
            isSelectable={element.isSelectable}
            handleSelect={(id) => setSelectedFile(id)}
            className={cn(
              "px-2 py-1.5 w-full text-left rounded-md transition-colors",
              isSelected
                ? "bg-[#0e639c] text-white hover:bg-[#1177bb] [&_svg]:text-white"
                : "text-[#cccccc] hover:text-white hover:bg-[#2d2d30] [&_svg]:text-[#858585]"
            )}
          >
            {element.name}
          </File>
        );
      }
    });
  };

  // Deduplicate phases first
  const uniquePhasesForDisplay = Array.from(
    new Map(phases.map((p) => [p.id, p])).values()
  );

  const totalTasks = uniquePhasesForDisplay.reduce(
    (sum, phase) => sum + phase.tasks.length,
    0
  );
  const completedTasks = uniquePhasesForDisplay.reduce(
    (sum, phase) =>
      sum + phase.tasks.filter((t) => t.status === "completed").length,
    0
  );
  const executionProgress =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const allTasks = uniquePhasesForDisplay.flatMap((phase) =>
    phase.tasks.map((task) => ({ ...task, phaseName: phase.name }))
  );

  const completedTasksWithFiles = allTasks.filter(
    (t) => t.status === "completed" && t.file_path
  );

  // Calculate task statuses from local phases state
  const taskStatuses = {
    pending: allTasks.filter((t) => t.status === "pending").length,
    in_progress: allTasks.filter((t) => t.status === "in_progress").length,
    completed: allTasks.filter((t) => t.status === "completed").length,
    failed: allTasks.filter((t) => t.status === "failed").length,
  };

  // Get file paths from completed tasks
  const filePaths = completedTasksWithFiles
    .map((task) => task.file_path)
    .filter((path): path is string => path !== null);

  const fileTreeElements = buildFileTreeSimple(filePaths);

  const codeChange = selectedFile ? getCodeChange(selectedFile) : null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Execution</h1>
              <p className="text-sm text-gray-600">
                Monitor task execution and code changes
              </p>
            </div>
            <TooltipProvider>
              <div className="flex items-center gap-3">
                {!executing &&
                  !starting &&
                  !paused &&
                  (status?.task_statuses?.pending > 0 ||
                    status?.task_statuses?.in_progress > 0) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleStart}
                          className="h-10 w-10 rounded-full bg-black hover:bg-black/90 text-white border-0 shadow-sm hover:shadow-md transition-all"
                          size="icon"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Start Execution</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                {(executing ||
                  starting ||
                  paused ||
                  hasStartedExecution ||
                  status?.task_statuses?.in_progress > 0) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handlePause}
                        disabled={starting}
                        className={`h-10 w-10 rounded-full transition-all shadow-sm hover:shadow-md ${
                          paused
                            ? "bg-black hover:bg-black/90 text-white border-0"
                            : "bg-black hover:bg-black/90 text-white border-0"
                        }`}
                        size="icon"
                      >
                        {paused ? (
                          <Play className="h-4 w-4" />
                        ) : (
                          <Pause className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{paused ? "Resume" : "Pause"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50">
            <div className="max-w-7xl mx-auto space-y-3">
              <Card className="border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-4">
                  {starting && (
                    <div className="mb-4 space-y-4">
                      <AgentThinking
                        messages={[
                          "Initializing execution environment...",
                          "Preparing tasks...",
                          "Starting code generation...",
                          "Ready to begin!",
                        ]}
                      />
                    </div>
                  )}

                  {/* Progress Overview */}
                  {executionProgress > 0 && (
                    <div className="mb-4 p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-900">
                          Overall Progress
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {Math.round(executionProgress)}%
                        </span>
                      </div>
                      <Progress value={executionProgress} className="h-2" />
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div className="p-2 rounded-lg bg-white border border-gray-200">
                          <div className="text-xs text-gray-600">Pending</div>
                          <div className="text-lg font-bold text-gray-900">
                            {taskStatuses.pending}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="text-xs text-gray-600">
                            In Progress
                          </div>
                          <div className="text-lg font-bold text-primary">
                            {taskStatuses.in_progress}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                          <div className="text-xs text-gray-600">Completed</div>
                          <div className="text-lg font-bold text-green-600">
                            {taskStatuses.completed}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                          <div className="text-xs text-gray-600">Failed</div>
                          <div className="text-lg font-bold text-red-600">
                            {taskStatuses.failed}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-3">
                    {/* Left: Timeline & Tasks */}
                    <div className="col-span-4 space-y-3">
                      {/* Timeline Component */}
                      <Card className="border border-gray-200 bg-white shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                            <GitBranch className="h-4 w-4 text-primary" />
                            Execution Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3 max-h-[300px] overflow-y-auto">
                            {allTasks.map((task, idx) => {
                              const isCompleted = task.status === "completed";
                              const isInProgress =
                                task.status === "in_progress";
                              const isPending = task.status === "pending";
                              const isFailed = task.status === "failed";

                              return (
                                <div
                                  key={task.id}
                                  className={`relative flex gap-3 transition-all ${
                                    isCompleted ? "opacity-60" : ""
                                  }`}
                                >
                                  {idx < allTasks.length - 1 && (
                                    <div
                                      className={`absolute left-2.5 top-6 w-0.5 h-full transition-all ${
                                        isCompleted
                                          ? "bg-green-200"
                                          : isInProgress
                                          ? "bg-blue-200"
                                          : "bg-gray-200"
                                      }`}
                                    />
                                  )}

                                  <div
                                    className={`relative z-10 flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                      isCompleted
                                        ? "bg-green-500 border-green-500"
                                        : isInProgress
                                        ? "bg-primary border-primary animate-pulse"
                                        : isFailed
                                        ? "bg-red-500 border-red-500"
                                        : "bg-gray-200 border-gray-300"
                                    }`}
                                  >
                                    <div className="transition-all">
                                      {getStatusIcon(task.status)}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0 pb-3">
                                    <div
                                      className={`p-2 rounded-md border transition-all cursor-pointer ${
                                        task.file_path && isCompleted
                                          ? "hover:bg-blue-50 hover:border-blue-300"
                                          : ""
                                      } ${
                                        isCompleted
                                          ? "bg-gray-50 border-gray-200"
                                          : isInProgress
                                          ? "bg-blue-50 border-blue-300"
                                          : isFailed
                                          ? "bg-red-50 border-red-300"
                                          : "bg-white border-gray-200"
                                      }`}
                                      onClick={() => {
                                        if (task.file_path && isCompleted) {
                                          setSelectedFile(task.file_path);
                                          setShowCodeEditor(true);
                                        }
                                      }}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <p
                                            className={`font-medium text-xs transition-all ${
                                              isCompleted
                                                ? "text-gray-500 line-through"
                                                : "text-gray-900"
                                            }`}
                                          >
                                            {task.name}
                                          </p>
                                          {task.file_path && (
                                            <p className="text-[10px] text-gray-500 mt-0.5 font-mono truncate">
                                              {task.file_path}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Task List by Phase */}
                      <Card className="border border-gray-200 bg-white shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                            <FileCode className="h-4 w-4 text-primary" />
                            Tasks by Phase
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div
                            ref={phaseTasksContainerRef}
                            className="space-y-3 max-h-[250px] overflow-y-auto scroll-smooth"
                          >
                            {Array.from(
                              new Map(phases.map((p) => [p.id, p])).values()
                            ).map((phase, phaseIdx) => (
                              <div
                                key={`phase-${phase.id}-${phaseIdx}`}
                                className="animate-in fade-in slide-in-from-left-4"
                                style={{
                                  animationDelay: `${phaseIdx * 100}ms`,
                                }}
                              >
                                <h4 className="font-semibold text-xs mb-2 p-1.5 rounded bg-gray-100 border border-gray-200 text-gray-900">
                                  {phase.name}
                                </h4>
                                <div className="space-y-1.5">
                                  {phase.tasks.map((task, taskIdx) => {
                                    const isCompleted =
                                      task.status === "completed";
                                    const isInProgress =
                                      task.status === "in_progress";
                                    return (
                                      <div
                                        key={task.id}
                                        data-task-id={task.id}
                                        ref={
                                          isInProgress
                                            ? (el) => {
                                                if (el)
                                                  activeTaskRef.current = el;
                                              }
                                            : null
                                        }
                                        className={`flex items-center gap-2 p-2 rounded-md text-xs transition-all border ${
                                          task.file_path && isCompleted
                                            ? "cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                                            : ""
                                        } ${
                                          isCompleted
                                            ? "bg-gray-50 border-gray-200 opacity-60"
                                            : isInProgress
                                            ? "bg-blue-50 border-blue-300 animate-pulse"
                                            : task.status === "failed"
                                            ? "bg-red-50 border-red-300"
                                            : "border-gray-200 hover:bg-gray-50"
                                        }`}
                                        onClick={() => {
                                          if (task.file_path && isCompleted) {
                                            setSelectedFile(task.file_path);
                                            setShowCodeEditor(true);
                                          }
                                        }}
                                      >
                                        <div className="transition-all">
                                          {getStatusIcon(task.status)}
                                        </div>
                                        <span
                                          className={`flex-1 font-medium transition-all ${
                                            isCompleted
                                              ? "text-gray-500 line-through"
                                              : isInProgress
                                              ? "text-primary font-semibold"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          {task.name}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Center: Agent Console */}
                    <div className="col-span-8">
                      <Card className="border border-gray-200 bg-white shadow-sm h-full">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    paused
                                      ? "bg-yellow-500"
                                      : "bg-primary animate-pulse"
                                  }`}
                                />
                                <Sparkles className="h-4 w-4 text-primary" />
                                Agent Console
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-600">
                                Real-time logs of agent activity and code
                                changes
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div
                            ref={logsContainerRef}
                            onScroll={checkIfAtBottom}
                            className="space-y-2 font-mono text-xs max-h-[600px] overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200"
                          >
                            {logs.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-500">
                                <Terminal className="h-12 w-12 mb-3 opacity-50" />
                                <p className="text-sm">
                                  No logs yet. Start execution to see agent
                                  activity.
                                </p>
                              </div>
                            ) : (
                              <>
                                {logs.map((log, idx) => {
                                  const isError = log.log_type === "error";
                                  const isCodeChange =
                                    log.log_type === "code_change";
                                  const isAgentMessage =
                                    log.log_type === "agent_message";

                                  return (
                                    <div
                                      key={log.id || idx}
                                      className={`p-2 rounded-md border transition-all ${
                                        isError
                                          ? "bg-red-50 text-red-700 border-red-200"
                                          : isCodeChange
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : isAgentMessage
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-white border-gray-200"
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0 mt-0.5">
                                          {isError ? (
                                            <XCircle className="h-3 w-3 text-red-600" />
                                          ) : isCodeChange ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                                          ) : (
                                            <Sparkles className="h-3 w-3 text-blue-600" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] text-gray-500 font-medium">
                                              {new Date(
                                                log.created_at
                                              ).toLocaleTimeString()}
                                            </span>
                                            {log.task_id && (
                                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                                Task #{log.task_id}
                                              </span>
                                            )}
                                          </div>
                                          <div className="leading-relaxed whitespace-pre-wrap break-words text-xs">
                                            {log.content}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div ref={logsEndRef} />
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Code Button - Right Side */}
                    {completedTasksWithFiles.length > 0 && (
                      <div className="col-span-12 flex justify-end">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowCodeEditor(true);
                                  if (completedTasksWithFiles[0]?.file_path) {
                                    setSelectedFile(
                                      completedTasksWithFiles[0].file_path
                                    );
                                  }
                                }}
                                className="border-gray-300 hover:bg-gray-50"
                              >
                                <Code2 className="h-4 w-4 mr-2 text-primary" />
                                <span className="text-sm font-medium text-primary">
                                  View Code Changes
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View code changes in full screen</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sticky Run Tests Button */}
          <div className="border-t border-gray-200 bg-white px-3 py-4 sticky bottom-0 z-10 flex-shrink-0">
            <div className="max-w-7xl mx-auto">
              <Button
                onClick={handleContinue}
                className="w-full h-10 text-sm font-medium bg-black hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  taskStatuses.pending > 0 ||
                  taskStatuses.in_progress > 0 ||
                  executing ||
                  starting
                }
              >
                Run Tests
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Code Changes Sheet - Full Screen */}
        <Sheet open={showCodeEditor} onOpenChange={setShowCodeEditor}>
          <SheetContent
            side="right"
            className="w-full sm:w-[90vw] sm:max-w-[90vw] p-0 overflow-hidden bg-[#1e1e1e] border-[#3e3e3e]"
          >
            <div className="h-full flex flex-col">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#3e3e3e] bg-[#252526]">
                <SheetTitle className="text-lg font-semibold flex items-center gap-2 text-[#cccccc]">
                  <FileText className="h-5 w-5 text-[#4ec9b0]" />
                  Code Changes
                </SheetTitle>
                {selectedFile && (
                  <SheetDescription className="font-mono text-xs text-[#858585] mt-2">
                    {selectedFile}
                  </SheetDescription>
                )}
              </SheetHeader>

              <div className="flex-1 flex overflow-hidden bg-[#1e1e1e]">
                {filePaths.length > 0 ? (
                  <div className="flex h-full w-full">
                    {/* Left Sidebar - File Tree */}
                    <div className="w-64 border-r border-[#3e3e3e] bg-[#252526] flex flex-col">
                      <div className="px-4 py-3 border-b border-[#3e3e3e]">
                        <h3 className="text-sm font-semibold text-[#cccccc]">
                          Files
                        </h3>
                        <p className="text-xs text-[#858585] mt-0.5">
                          {filePaths.length} file
                          {filePaths.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex-1 overflow-hidden bg-[#252526]">
                        <div className="h-full py-2">
                          <Tree
                            key={selectedFile || "none"}
                            initialSelectedId={selectedFile || undefined}
                            initialExpandedItems={fileTreeElements.map(
                              (e) => e.id
                            )}
                            className="h-full"
                          >
                            {renderTree(fileTreeElements)}
                          </Tree>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Code Diff */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {codeChange ? (
                        <>
                          {/* Legend */}
                          <div className="px-6 py-3 border-b border-[#3e3e3e] bg-[#252526]">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-xs text-[#858585]">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#f48771]" />
                                  <span>Removed lines</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#4ec9b0]" />
                                  <span>Added lines</span>
                                </div>
                              </div>
                              {selectedFile && (
                                <div className="text-xs text-[#858585] font-mono">
                                  {selectedFile}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Monaco Diff Editor */}
                          <div className="flex-1 px-6 py-4 overflow-hidden">
                            <div className="h-full w-full">
                              <MonacoDiff
                                before={codeChange.before}
                                after={codeChange.after}
                                fileName={selectedFile || undefined}
                                height="100%"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-[#858585] px-6">
                          <FileText className="h-12 w-12 mb-3 opacity-50" />
                          <p className="text-sm">
                            {selectedFile
                              ? "No code changes available for this file"
                              : "Select a file from the tree to view code changes"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-[#858585] px-6 w-full">
                    <FileText className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">
                      No files with code changes available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default function ExecutionPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    }>
      <ExecutionPageContent />
    </Suspense>
  );
}
