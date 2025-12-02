"use client";

import { diffLines } from "diff";
import { cn } from "@/lib/utils";

interface GitHubDiffProps {
  before: string;
  after: string;
  language?: string;
  fileName?: string;
}

export function GitHubDiff({ before, after, fileName }: GitHubDiffProps) {
  const changes = diffLines(before, after);
  let oldLineNumber = 0;
  let newLineNumber = 0;

  return (
    <div className="w-full border border-[#3e3e3e] rounded-lg overflow-hidden bg-[#1e1e1e]">
      {/* File header */}
      {fileName && (
        <div className="px-4 py-2 bg-[#252526] border-b border-[#3e3e3e] flex items-center gap-2 text-sm font-medium">
          <span className="text-[#cccccc]">{fileName}</span>
        </div>
      )}

      {/* Diff content */}
      <div className="overflow-x-auto bg-[#1e1e1e]">
        <table className="w-full border-collapse">
          <tbody className="font-mono text-sm leading-relaxed">
            {changes.map((part, partIndex) => {
              const lines = part.value.split("\n");
              // Remove the last empty line if it exists (from split)
              if (lines[lines.length - 1] === "") {
                lines.pop();
              }

              const isAdded = part.added;
              const isRemoved = part.removed;
              const isUnchanged = !isAdded && !isRemoved;

              return lines.map((line, lineIndex) => {
                const isLastLine = lineIndex === lines.length - 1;
                const isFirstLine = lineIndex === 0;

                // Calculate line numbers
                let oldNum: number | null = null;
                let newNum: number | null = null;

                if (isRemoved) {
                  oldLineNumber++;
                  oldNum = oldLineNumber;
                } else if (isAdded) {
                  newLineNumber++;
                  newNum = newLineNumber;
                } else {
                  oldLineNumber++;
                  newLineNumber++;
                  oldNum = oldLineNumber;
                  newNum = newLineNumber;
                }

                return (
                  <tr
                    key={`${partIndex}-${lineIndex}`}
                    className={cn(
                      "group",
                      isAdded && "bg-[#264f78] hover:bg-[#2d5a8a]",
                      isRemoved && "bg-[#5a1d1d] hover:bg-[#6a2323]",
                      isUnchanged && "hover:bg-[#2a2d2e]"
                    )}
                  >
                    {/* Old line number */}
                    <td
                      className={cn(
                        "px-4 py-0.5 text-right select-none border-r border-[#3e3e3e]",
                        "text-[#858585] min-w-[60px] sticky left-0 z-10",
                        isRemoved && "bg-[#5a1d1d]",
                        isUnchanged && "bg-[#1e1e1e]"
                      )}
                    >
                      {oldNum !== null ? oldNum : ""}
                    </td>

                    {/* New line number */}
                    <td
                      className={cn(
                        "px-4 py-0.5 text-right select-none border-r border-[#3e3e3e]",
                        "text-[#858585] min-w-[60px] sticky left-[60px] z-10",
                        isAdded && "bg-[#264f78]",
                        isUnchanged && "bg-[#1e1e1e]"
                      )}
                    >
                      {newNum !== null ? newNum : ""}
                    </td>

                    {/* Line content */}
                    <td
                      className={cn(
                        "px-4 py-0.5",
                        isAdded && "bg-[#264f78] text-[#4ec9b0]",
                        isRemoved && "bg-[#5a1d1d] text-[#f48771]",
                        isUnchanged && "text-[#d4d4d4] bg-[#1e1e1e]"
                      )}
                    >
                      {/* Plus/Minus indicator */}
                      <span
                        className={cn(
                          "inline-block w-5 text-center mr-3 select-none font-bold",
                          isAdded && "text-[#4ec9b0]",
                          isRemoved && "text-[#f48771]",
                          isUnchanged && "text-transparent"
                        )}
                      >
                        {isAdded ? "+" : isRemoved ? "-" : " "}
                      </span>
                      <span className="whitespace-pre-wrap break-words">{line || " "}</span>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

