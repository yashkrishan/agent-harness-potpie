"use client";

import { CheckCircle2, Circle, ArrowRight, Home } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface TimelineStep {
  id: string;
  name: string;
  path: string;
}

const steps: TimelineStep[] = [
  { id: "idea", name: "Idea", path: "/idea" },
  { id: "repo", name: "Repository", path: "/repo" },
  { id: "plan", name: "Plan", path: "/plan" },
  { id: "tasks", name: "Tasks", path: "/tasks" },
  { id: "design", name: "Design", path: "/design" },
  { id: "execution", name: "Execution", path: "/execution" },
  { id: "testing", name: "Testing", path: "/testing" },
];

export function Timeline() {
  const pathname = usePathname();
  const router = useRouter();

  const getCurrentStepIndex = () => {
    if (pathname?.includes("/idea")) return 0;
    if (pathname?.includes("/repo")) return 1;
    if (pathname?.includes("/plan")) return 2;
    if (pathname?.includes("/tasks")) return 3;
    if (pathname?.includes("/design")) return 4;
    if (pathname?.includes("/execution")) return 5;
    if (pathname?.includes("/testing")) return 6;
    return -1;
  };

  const currentStepIndex = getCurrentStepIndex();
  
  // Calculate the width of the colored line based on current step
  // With 7 steps evenly distributed using flex-1, each step takes 1/7 of the width
  // The center of step i is at (i + 0.5) / 7 from left
  // Line starts from 0 and extends to center of current step
  const lineStart = "0%"; // Start from left edge
  const lineEnd = "calc(6.5 / 7 * 100%)"; // Center of last step (where line ends)
  
  // Colored line width: extends from start to center of current step
  // When at step i, line extends to (i + 0.5) / 7
  const coloredLineWidth = currentStepIndex >= 0 
    ? `calc((${currentStepIndex} + 0.5) / 7 * 100%)` // Extend to center of current step
    : '0%';

  return (
    <div className="w-full bg-black backdrop-blur-sm border-b border-blue-200/50 py-2 px-6 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto">
        {/* Logo with black card background and Home button */}
        <div className="flex items-center justify-center w-full mb-3">
          <Image
            src="/logo.png"
            alt="Logo"
            width={100}
            height={32}
            className="h-auto w-auto object-contain cursor-pointer"
            priority
            onClick={() => router.push("/")}
          />
        </div>

        {/* Timeline - Compact */}
        <div className="flex items-center justify-between relative">
          {/* Base connector line - stops at final step center (gray background) */}
          <div
            className="absolute top-4 h-0.5 bg-border/50 -z-0"
            style={{
              left: lineStart,
              right: `calc(100% - ${lineEnd})`,
            }}
          />
          {/* Colored connector line - extends to current step */}
          {currentStepIndex >= 0 && (
            <div
              className="absolute top-4 h-0.5 bg-primary -z-0 transition-all duration-300"
              style={{
                left: lineStart,
                width: coloredLineWidth,
              }}
            />
          )}

          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;

            return (
              <div
                key={step.id}
                className="flex-1 flex flex-col items-center relative z-10"
              >
                <div className="flex items-center justify-center w-full">
                  {/* Step circle - smaller */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                      isCompleted
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary/20 border-primary text-primary scale-110"
                        : "bg-background border-border/50 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle
                        className={`h-4 w-4 ${isCurrent ? "fill-primary" : ""}`}
                      />
                    )}
                  </div>

                  {/* Arrow between steps */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 flex items-center justify-center mx-1">
                      <ArrowRight
                        className={`h-3 w-3 transition-colors ${
                          isCompleted ? "text-primary" : "text-border/50"
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Step label - smaller */}
                <div className="mt-1.5 text-center">
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isCompleted || isCurrent
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
