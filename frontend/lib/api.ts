const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createProject(idea: string) {
  const res = await fetch(`${API_BASE}/api/projects/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function getProject(projectId: number) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`);
  if (!res.ok) throw new Error("Failed to get project");
  return res.json();
}

export async function updateProject(projectId: number, updates: any) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update project");
  return res.json();
}

export async function selectRepo(projectId: number, repoUrl: string, githubToken?: string) {
  const res = await fetch(`${API_BASE}/api/repos/select?project_id=${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl, github_token: githubToken }),
  });
  if (!res.ok) throw new Error("Failed to select repo");
  return res.json();
}

export async function analyzeRepo(projectId: number) {
  const res = await fetch(`${API_BASE}/api/repos/analyze?project_id=${projectId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to analyze repo");
  return res.json();
}

export async function generatePlanQuestions(projectId: number) {
  const res = await fetch(`${API_BASE}/api/plan/questions?project_id=${projectId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate plan questions");
  return res.json();
}

export async function generatePlan(projectId: number) {
  const res = await fetch(`${API_BASE}/api/plan/generate?project_id=${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to generate plan");
  return res.json();
}

export async function approvePlanSection(projectId: number, section: string, approved: boolean) {
  const res = await fetch(`${API_BASE}/api/plan/approve-section?project_id=${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section, approved }),
  });
  if (!res.ok) throw new Error("Failed to approve section");
  return res.json();
}

export async function getPlan(projectId: number) {
  const res = await fetch(`${API_BASE}/api/plan/${projectId}`);
  if (!res.ok) throw new Error("Failed to get plan");
  return res.json();
}

export async function generateTasks(projectId: number) {
  const res = await fetch(`${API_BASE}/api/tasks/generate?project_id=${projectId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate tasks");
  return res.json();
}

export async function getTasks(projectId: number) {
  const res = await fetch(`${API_BASE}/api/tasks/${projectId}`);
  if (!res.ok) throw new Error("Failed to get tasks");
  return res.json();
}

export async function generateDesign(phaseId: number) {
  const res = await fetch(`${API_BASE}/api/design/generate/${phaseId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate design");
  return res.json();
}

export async function getDesign(phaseId: number) {
  const res = await fetch(`${API_BASE}/api/design/phase/${phaseId}`);
  if (!res.ok) throw new Error("Failed to get design");
  return res.json();
}

export async function updateDesign(designId: number, updates: any) {
  const res = await fetch(`${API_BASE}/api/design/${designId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update design");
  return res.json();
}

export async function approveAllDesigns(projectId: number) {
  const res = await fetch(`${API_BASE}/api/design/approve-all/${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to approve all designs");
  return res.json();
}

export async function startExecution(projectId: number) {
  const res = await fetch(`${API_BASE}/api/execution/start?project_id=${projectId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to start execution");
  return res.json();
}

export async function executionCommand(projectId: number, command: string) {
  const res = await fetch(`${API_BASE}/api/execution/command?project_id=${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  if (!res.ok) throw new Error("Failed to execute command");
  return res.json();
}

export async function getExecutionLogs(projectId: number, taskId?: number) {
  const url = `${API_BASE}/api/execution/logs/${projectId}${taskId ? `?task_id=${taskId}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to get logs");
  return res.json();
}

export async function getExecutionStatus(projectId: number) {
  const res = await fetch(`${API_BASE}/api/execution/status/${projectId}`);
  if (!res.ok) throw new Error("Failed to get status");
  return res.json();
}

export async function runTestCommand(projectId: number, command: string, args?: string[]) {
  const res = await fetch(`${API_BASE}/api/testing/run-command?project_id=${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command, args }),
  });
  if (!res.ok) throw new Error("Failed to run test command");
  return res.json();
}

export async function getTestLogs(projectId: number) {
  const res = await fetch(`${API_BASE}/api/testing/test-logs/${projectId}`);
  if (!res.ok) throw new Error("Failed to get test logs");
  return res.json();
}

export async function createPR(projectId: number, githubToken: string, baseBranch: string = "main") {
  const res = await fetch(`${API_BASE}/api/pr/create?project_id=${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_token: githubToken, base_branch: baseBranch }),
  });
  if (!res.ok) throw new Error("Failed to create PR");
  return res.json();
}

export async function getPR(projectId: number) {
  const res = await fetch(`${API_BASE}/api/pr/${projectId}`);
  if (!res.ok) throw new Error("Failed to get PR");
  return res.json();
}

