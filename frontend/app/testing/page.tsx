"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { runTestCommand, getTestLogs, createPR } from "@/lib/api"
import { ArrowRight, Play, Loader2, CheckCircle2, Terminal, GitBranch, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Sidebar } from "@/components/sidebar"

function TestingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = parseInt(searchParams.get("projectId") || "0")
  
  const [command, setCommand] = useState("python3 -m pytest tests/")
  const [testOutput, setTestOutput] = useState<any>(null)
  const [running, setRunning] = useState(false)
  const [testLogs, setTestLogs] = useState<any[]>([])
  const [githubToken, setGithubToken] = useState("demo_token_12345")
  const [baseBranch, setBaseBranch] = useState("main")
  const [creatingPR, setCreatingPR] = useState(false)
  const [prCreated, setPrCreated] = useState(false)
  const [prUrl, setPrUrl] = useState("")
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    if (projectId > 0) {
      loadTestLogs()
    }
  }, [projectId])

  const loadTestLogs = async () => {
    if (loadingLogs) return
    setLoadingLogs(true)
    try {
      const result = await getTestLogs(projectId)
      console.log("Test logs loaded:", result)
      if (result && result.logs) {
        setTestLogs(result.logs)
      } else {
        setTestLogs([])
      }
    } catch (error) {
      console.error("Failed to load test logs:", error)
      setTestLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleRunCommand = async () => {
    setRunning(true)
    setTestOutput(null)
    try {
      const parts = command.split(" ")
      const cmd = parts[0]
      const args = parts.slice(1)
      const result = await runTestCommand(projectId, cmd, args)
      console.log("Test command result:", result)
      setTestOutput(result)
      // Wait a bit for logs to be saved, then reload
      setTimeout(() => {
        loadTestLogs()
      }, 500)
    } catch (error: any) {
      console.error("Test command error:", error)
      setTestOutput({
        stdout: "",
        stderr: error.message || "Failed to run command",
        returncode: 1
      })
    } finally {
      setRunning(false)
    }
  }

  const handleCreatePR = async () => {
    setCreatingPR(true)
    try {
      const result = await createPR(projectId, githubToken || "demo_token", baseBranch)
      setPrCreated(true)
      setPrUrl(result.pr_url)
    } catch (error: any) {
      toast.error(`Failed to create PR: ${error.message}`)
    } finally {
      setCreatingPR(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-8 py-4 h-[73px]">
          <div className="flex flex-col justify-center h-full">
            <h1 className="text-xl font-semibold text-gray-900">Testing & Validation</h1>
            <p className="text-sm text-gray-600 mt-1">Test your implementation and create a pull request</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <Card className="border border-gray-200 bg-white shadow-sm">
              <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 items-start">
              {/* Left: Test Commands */}
              <div className="space-y-3 flex flex-col h-full">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Label htmlFor="command" className="text-sm font-semibold mb-2 block text-gray-900">Test Command</Label>
                  <div className="flex gap-2">
                    <Input
                      id="command"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder="python3 -m pytest tests/"
                      className="h-9 text-sm border-gray-300 focus:border-primary transition-colors flex-1"
                    />
                    <Button onClick={handleRunCommand} disabled={running} className="h-9 px-4 border-gray-300 hover:bg-gray-50">
                      {running ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {testOutput && (
                  <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                        <Terminal className="h-4 w-4" />
                        Command Output
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {testOutput.stdout && (
                        <div>
                          <Label className="text-green-600 font-medium mb-1.5 flex items-center gap-1.5 text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Test Output:
                          </Label>
                          <pre className="bg-gray-50 p-3 rounded-md border border-green-200 text-xs overflow-x-auto font-mono leading-relaxed">
                            {testOutput.stdout}
                          </pre>
                        </div>
                      )}
                      {testOutput.stderr && (
                        <div>
                          <Label className="text-red-600 font-medium mb-1.5 block text-xs">Errors:</Label>
                          <pre className="bg-gray-50 p-3 rounded-md border border-red-200 text-xs overflow-x-auto font-mono">
                            {testOutput.stderr}
                          </pre>
                        </div>
                      )}
                      <div className={`mt-3 p-3 rounded-md border transition-all ${
                        testOutput.returncode === 0 
                          ? "bg-green-50 border-green-200" 
                          : "bg-red-50 border-red-200"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-900">Test Status: </span>
                          <span className={`text-sm font-bold flex items-center gap-1.5 ${
                            testOutput.returncode === 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {testOutput.returncode === 0 ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                All Tests Passed
                              </>
                            ) : (
                              "Tests Failed"
                            )}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* PR Creation */}
                <Card className="border border-gray-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-900">
                      <GitBranch className="h-4 w-4 text-primary" />
                      Create Pull Request
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600">
                      Generate a pull request with all your code changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div>
                      <Label htmlFor="baseBranch" className="text-xs font-medium mb-1.5 block text-gray-900">Base Branch</Label>
                      <Input
                        id="baseBranch"
                        value={baseBranch}
                        onChange={(e) => setBaseBranch(e.target.value)}
                        placeholder="main"
                        className="h-9 text-sm border-gray-300 focus:border-primary transition-colors"
                      />
                    </div>
                    {prCreated && prUrl && (
                      <div className="p-3 rounded-md bg-green-50 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm text-green-600">PR Created Successfully!</span>
                        </div>
                        <Button
                          onClick={() => window.open(prUrl, '_blank', 'noopener,noreferrer')}
                          className="w-full h-9 text-sm font-medium bg-black hover:bg-black/90"
                          size="sm"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Pull Request
                        </Button>
                      </div>
                    )}
                    <Button 
                      onClick={handleCreatePR} 
                      disabled={creatingPR || prCreated}
                      className="w-full h-9 text-sm font-medium bg-black hover:bg-black/90 disabled:opacity-50"
                      size="sm"
                    >
                      {creatingPR ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating PR...
                        </>
                      ) : prCreated ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          PR Created Successfully
                        </>
                      ) : (
                        <>
                          <GitBranch className="mr-2 h-4 w-4" />
                          Create Pull Request
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Test Logs */}
              <div className="flex flex-col h-full">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-900">
                  {loadingLogs ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                  <Terminal className="h-4 w-4 text-primary" />
                  Test Logs
                  {testLogs.length > 0 && (
                    <span className="ml-auto text-xs text-gray-500 font-normal">
                      {testLogs.length} log{testLogs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </h3>
                <div className="border border-gray-200 rounded-lg p-3 min-h-[500px] overflow-y-auto bg-gray-50 flex-1">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Loader2 className="h-12 w-12 mb-3 animate-spin text-primary" />
                      <p className="text-sm">Loading test logs...</p>
                    </div>
                  ) : testLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Terminal className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm font-medium">No test logs yet</p>
                      <p className="text-xs mt-1 text-gray-400">Run a test command to see logs here</p>
                    </div>
                  ) : (
                    <div className="space-y-2 font-mono text-xs">
                      {testLogs.map((log, idx) => (
                        <div 
                          key={log.id || idx} 
                          className="p-2 bg-white rounded-md border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                          <div className="text-[10px] text-gray-500 mb-1.5 font-medium">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                          </div>
                          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-900">{log.content || log.message || JSON.stringify(log)}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
            </Card>
          </div>
        </div>
      </div>

    </div>
  )
}

export default function TestingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    }>
      <TestingPageContent />
    </Suspense>
  )
}

