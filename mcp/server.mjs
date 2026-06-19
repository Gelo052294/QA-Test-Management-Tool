#!/usr/bin/env node
/**
 * MCP server for the QA Test Management Tool.
 *
 * Lets an MCP client (e.g. Claude) record test execution results and upload
 * evidence files into the tool, using its REST API + a personal API token.
 *
 * Required environment variables:
 *   QATMS_BASE_URL   e.g. https://your-app.vercel.app   (no trailing slash needed)
 *   QATMS_API_TOKEN  a token from Settings -> API token in the app
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

const BASE = (process.env.QATMS_BASE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.QATMS_API_TOKEN || "";

if (!BASE || !TOKEN) {
  console.error(
    "QATMS_BASE_URL and QATMS_API_TOKEN must be set. " +
      "Get a token from Settings -> API token in the app."
  );
  process.exit(1);
}

const authHeader = { Authorization: `Bearer ${TOKEN}` };

async function api(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeader, ...(init.headers || {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status} on ${path}`);
  }
  return data;
}

async function resolveProjectId(projectKey) {
  const { projects } = await api("/api/projects");
  const p = projects.find((x) => x.key.toLowerCase() === projectKey.toLowerCase());
  if (!p) throw new Error(`Project "${projectKey}" not found`);
  return p.id;
}

async function resolveCycle(cycleKey) {
  const { cycles } = await api("/api/cycles");
  const c = cycles.find((x) => (x.key || "").toLowerCase() === cycleKey.toLowerCase());
  if (!c) throw new Error(`Cycle "${cycleKey}" not found`);
  return c;
}

async function resolveExecution(cycleKey, testCaseKey) {
  const cycle = await resolveCycle(cycleKey);
  const full = await api(`/api/cycles/${cycle.id}`);
  const exec = full.cycle.executions.find(
    (e) => e.testCase.key.toLowerCase() === testCaseKey.toLowerCase()
  );
  if (!exec) {
    throw new Error(`Test case "${testCaseKey}" is not in cycle "${cycleKey}"`);
  }
  return { cycle, exec };
}

const ok = (text) => ({ content: [{ type: "text", text }] });
const fail = (text) => ({ content: [{ type: "text", text }], isError: true });

const server = new McpServer({ name: "qa-tms", version: "1.0.0" });

server.tool(
  "qa_list_projects",
  "List projects in the QA Test Management Tool.",
  {},
  async () => {
    try {
      const { projects } = await api("/api/projects");
      return ok(projects.map((p) => `${p.key} — ${p.name}`).join("\n") || "No projects.");
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_list_cycles",
  "List test cycles, optionally filtered by project key.",
  { projectKey: z.string().optional().describe("e.g. AUR (omit for all projects)") },
  async ({ projectKey }) => {
    try {
      let path = "/api/cycles";
      if (projectKey) path += `?projectId=${encodeURIComponent(await resolveProjectId(projectKey))}`;
      const { cycles } = await api(path);
      return ok(
        cycles.map((c) => `${c.key || "(no key)"} — ${c.name} [${c.status}]`).join("\n") ||
          "No cycles."
      );
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_list_cycle_tests",
  "List the test cases in a cycle with their current results.",
  { cycleKey: z.string().describe("e.g. AUR-C1") },
  async ({ cycleKey }) => {
    try {
      const cycle = await resolveCycle(cycleKey);
      const full = await api(`/api/cycles/${cycle.id}`);
      const lines = full.cycle.executions.map(
        (e) =>
          `${e.testCase.key}  ${e.status}` +
          (e.executedBy ? `  (by ${e.executedBy.name})` : "")
      );
      return ok(`${cycle.key} — ${cycle.name}\n${lines.join("\n") || "No test cases."}`);
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_set_result",
  "Record a test execution result for a test case within a cycle.",
  {
    cycleKey: z.string().describe("e.g. AUR-C1"),
    testCaseKey: z.string().describe("e.g. AUR-T1"),
    status: z.enum(["not_run", "pass", "fail", "blocked"]),
    comment: z.string().optional(),
    defectJiraKey: z.string().optional().describe("e.g. PROJ-123"),
  },
  async ({ cycleKey, testCaseKey, status, comment, defectJiraKey }) => {
    try {
      const { exec } = await resolveExecution(cycleKey, testCaseKey);
      await api(`/api/executions/${exec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment, defectJiraKey }),
      });
      return ok(`Recorded ${testCaseKey} = ${status} in ${cycleKey}.`);
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_upload_evidence",
  "Upload an evidence file (screenshot, log, etc.) to a test execution.",
  {
    cycleKey: z.string().describe("e.g. AUR-C1"),
    testCaseKey: z.string().describe("e.g. AUR-T1"),
    filePath: z.string().describe("Absolute path to the file to upload"),
  },
  async ({ cycleKey, testCaseKey, filePath }) => {
    try {
      const { exec } = await resolveExecution(cycleKey, testCaseKey);
      const buf = await readFile(filePath);
      const form = new FormData();
      form.append("file", new Blob([buf]), basename(filePath));
      // fetch sets the multipart boundary; only the auth header is added.
      const res = await fetch(`${BASE}/api/executions/${exec.id}/evidence`, {
        method: "POST",
        headers: authHeader,
        body: form,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Upload failed: HTTP ${res.status} ${t}`);
      }
      return ok(`Uploaded ${basename(filePath)} to ${testCaseKey} in ${cycleKey}.`);
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("qa-tms MCP server running on stdio");
