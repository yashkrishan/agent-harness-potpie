const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Default fetch options that include credentials (cookies)
const defaultOptions: RequestInit = {
  credentials: "include",
};

export async function createProject(idea: string) {
  const res = await fetch(`${API_BASE}/api/projects/`, {
    ...defaultOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function getProject(projectId: number) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
    ...defaultOptions,
  });
  if (!res.ok) throw new Error("Failed to get project");
  return res.json();
}

export async function updateProject(projectId: number, updates: any) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
    ...defaultOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update project");
  return res.json();
}

export async function deleteProject(projectId: number) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`, {
    ...defaultOptions,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete project");
  return res.json();
}

export async function listProjects() {
  const res = await fetch(`${API_BASE}/api/projects/`, {
    ...defaultOptions,
  });
  if (!res.ok) throw new Error("Failed to list projects");
  return res.json();
}

export async function createRepo(projectId: number, repoUrl: string, githubToken?: string) {
  const res = await fetch(`${API_BASE}/api/repos/`, {
    ...defaultOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, repo_url: repoUrl, github_token: githubToken }),
  });
  if (!res.ok) throw new Error("Failed to create repo");
  return res.json();
}

export async function getRepos(projectId: number) {
  const res = await fetch(`${API_BASE}/api/repos/?project_id=${projectId}`, {
    ...defaultOptions,
  });
  if (!res.ok) throw new Error("Failed to get repos");
  return res.json();
}

export async function deleteRepo(repoId: number) {
  const res = await fetch(`${API_BASE}/api/repos/${repoId}`, {
    ...defaultOptions,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete repo");
  return res.json();
}

export async function createPR(
  repoId: number,
  title: string,
  body: string,
  base: string,
  head: string,
  githubToken: string
) {
  const res = await fetch(`${API_BASE}/api/prs/`, {
    ...defaultOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_id: repoId,
      title,
      body,
      base,
      head,
      github_token: githubToken,
    }),
  });
  if (!res.ok) throw new Error("Failed to create PR");
  return res.json();
}

export async function getPRs(repoId: number) {
  const res = await fetch(`${API_BASE}/api/prs/?repo_id=${repoId}`, {
    ...defaultOptions,
  });
  if (!res.ok) throw new Error("Failed to get PRs");
  return res.json();
}

export async function getPR(prId: number) {
  const res = await fetch(`${API_BASE}/api/prs/${prId}`, {
    ...defaultOptions,
  });
  if (!res.ok) throw new Error("Failed to get PR");
  return res.json();
}

export async function updatePR(prId: number, updates: any) {
  const res = await fetch(`${API_BASE}/api/prs/${prId}`, {
    ...defaultOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update PR");
  return res.json();
}

export async function deletePR(prId: number) {
  const res = await fetch(`${API_BASE}/api/prs/${prId}`, {
    ...defaultOptions,
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete PR");
  return res.json();
}
