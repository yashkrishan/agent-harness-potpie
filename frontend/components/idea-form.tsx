"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Loader2,
  Github,
  Plus,
  Paperclip,
  Mic,
} from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Card } from "@/components/ui/card";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";

export interface IdeaFormProps {
  /** Initial idea value for controlled input (used for demo mode) */
  idea: string;
  /** Callback function invoked when form is submitted with valid idea */
  onSubmit: (idea: string) => void;
  /** Controls disabled state of form during API submission */
  isLoading: boolean;
  /** Error message to display when validation or API fails */
  error: string | null;
}

interface LinkedRepo {
  id: string;
  name: string;
  url: string;
  description: string;
}

const defaultLinkedRepos: LinkedRepo[] = [
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

export function IdeaForm({ idea, onSubmit, isLoading, error }: IdeaFormProps) {
  const [input, setInput] = useState(idea);
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleRepoChange = (value: string) => {
    if (value === "connect-repo") {
      // Handle connect repo action
      setSelectedRepo("");
    } else {
      setSelectedRepo(value);
    }
  };

  return (
    <div className="w-full max-w-2xl space-y-4 relative z-10">
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6">
          {/* Logo placeholder - would be passed as prop or imported */}
          <div className="w-16 h-16 bg-gray-200 rounded-full" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">
          Let&apos;s cook some ideas!
        </h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

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
                {defaultLinkedRepos.find((r) => r.id === selectedRepo)?.name ||
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
          placeholder="Describe your feature idea... (e.g., Integrate payment with stripe.)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="w-full min-h-[140px] max-h-[300px] resize-none bg-transparent border-0 focus:ring-0 focus-visible:ring-0 px-5 pt-5 pb-20 text-base text-gray-900 placeholder:text-gray-500 disabled:opacity-50"
          rows={4}
        />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select
              value={selectedRepo}
              onValueChange={handleRepoChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 px-4 rounded-full bg-white border-gray-300 hover:bg-gray-50 text-sm font-medium">
                <Github className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select repo" />
              </SelectTrigger>
              <SelectContent>
                {defaultLinkedRepos.map((repo) => (
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
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 rounded-full bg-black hover:bg-black/90 text-white disabled:opacity-50 shadow-md"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <BorderBeam duration={8} size={150} />
      </Card>
    </div>
  );
}
