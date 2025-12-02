"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Workflow,
  Play,
  Zap,
  Code,
  Rocket,
  Search,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";

export default function Home() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleGoalSelect = (goal: string) => {
    setSelectedGoal(goal);
    if (goal === "demo") {
      router.push("/idea?demo=true");
    } else {
      router.push("/idea");
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search builds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                className="bg-black hover:bg-black/90 text-white"
                onClick={() => router.push("/idea")}
              >
                <Zap className="h-4 w-4 mr-2" />
                New Build
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Builds
              </h1>
              <p className="text-sm text-gray-600">
                Create and manage your AI-powered development builds
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card
                className="group cursor-pointer border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 bg-white"
                onClick={() => handleGoalSelect("feature")}
              >
                <CardHeader className="space-y-3 pb-4">
                  <div className="p-2.5 rounded-lg bg-blue-50 w-fit group-hover:bg-blue-100 transition-colors">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Build a Feature
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 leading-relaxed">
                    Describe a feature idea and let the agent build it
                    end-to-end with comprehensive planning, design, and
                    implementation
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Code className="h-3.5 w-3.5" />
                    <span>Full-stack implementation</span>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group cursor-pointer border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 bg-white"
                onClick={() => handleGoalSelect("workflow")}
              >
                <CardHeader className="space-y-3 pb-4">
                  <div className="p-2.5 rounded-lg bg-blue-50 w-fit group-hover:bg-blue-100 transition-colors">
                    <Workflow className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Build a Workflow
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 leading-relaxed">
                    Create automated workflows and integrations that streamline
                    your development process and connect services
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Rocket className="h-3.5 w-3.5" />
                    <span>Automation & integration</span>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="group cursor-pointer border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 bg-white"
                onClick={() => handleGoalSelect("demo")}
              >
                <CardHeader className="space-y-3 pb-4">
                  <div className="p-2.5 rounded-lg bg-blue-50 w-fit group-hover:bg-blue-100 transition-colors">
                    <Play className="h-5 w-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    See a Demo
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 leading-relaxed">
                    Explore the tool with a pre-configured fraud detection
                    pipeline demo showcasing the full workflow
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Zap className="h-3.5 w-3.5" />
                    <span>Interactive walkthrough</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
