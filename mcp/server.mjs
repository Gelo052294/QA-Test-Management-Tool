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

async function resolveTestCaseIds(projectId, keys) {
  const { testCases } = await api(`/api/test-cases?projectId=${projectId}`);
  const byKey = new Map(testCases.map((t) => [t.key.toLowerCase(), t.id]));
  const ids = [];
  const missing = [];
  for (const k of keys) {
    const id = byKey.get(k.toLowerCase());
    if (id) ids.push(id);
    else missing.push(k);
  }
  return { ids, missing };
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

server.tool(
  "qa_create_test_case",
  "Create a test case in a project.",
  {
    projectKey: z.string().describe("e.g. AUR"),
    title: z.string(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    status: z.enum(["draft", "active", "deprecated"]).optional(),
    description: z.string().optional(),
    preconditions: z.string().optional(),
    jiraKey: z.string().optional().describe("e.g. PROJ-123"),
    steps: z
      .array(z.object({ step: z.string(), expectedResult: z.string().optional() }))
      .optional()
      .describe("Ordered steps with expected results"),
  },
  async (a) => {
    try {
      const projectId = await resolveProjectId(a.projectKey);
      const { testCase } = await api("/api/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: a.title,
          priority: a.priority,
          status: a.status,
          description: a.description,
          preconditions: a.preconditions,
          jiraKey: a.jiraKey,
          steps: a.steps ?? [],
        }),
      });
      return ok(`Created ${testCase.key}: ${testCase.title}`);
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_create_cycle",
  "Create a test cycle in a project. Start and end dates are required (YYYY-MM-DD).",
  {
    projectKey: z.string().describe("e.g. AUR"),
    name: z.string(),
    startDate: z.string().describe("YYYY-MM-DD"),
    endDate: z.string().describe("YYYY-MM-DD"),
    description: z.string().optional(),
  },
  async (a) => {
    try {
      const projectId = await resolveProjectId(a.projectKey);
      const { cycle } = await api("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: a.name,
          startDate: a.startDate,
          endDate: a.endDate,
          description: a.description,
        }),
      });
      return ok(`Created cycle ${cycle.key}: ${cycle.name}`);
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_add_tests_to_cycle",
  "Add test cases (by key) to a cycle.",
  {
    cycleKey: z.string().describe("e.g. AUR-C1"),
    testCaseKeys: z.array(z.string()).describe("e.g. ['AUR-T1','AUR-T2']"),
  },
  async ({ cycleKey, testCaseKeys }) => {
    try {
      const cycle = await resolveCycle(cycleKey);
      const { ids, missing } = await resolveTestCaseIds(cycle.projectId, testCaseKeys);
      if (ids.length === 0) return fail(`No matching test cases found: ${missing.join(", ")}`);
      const res = await api(`/api/cycles/${cycle.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCaseIds: ids }),
      });
      let msg = `Added ${res.added} test case(s) to ${cycleKey}.`;
      if (missing.length) msg += ` Not found: ${missing.join(", ")}.`;
      return ok(msg);
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_report_cycle_summary",
  "Get the pass/fail summary for a cycle.",
  { cycleKey: z.string().describe("e.g. AUR-C1") },
  async ({ cycleKey }) => {
    try {
      const cycle = await resolveCycle(cycleKey);
      const r = await api(`/api/reports/cycle-summary?cycleId=${cycle.id}`);
      return ok(
        `${cycle.key} — ${r.cycle.name}\n` +
          `Total ${r.total} · Pass ${r.counts.pass} · Fail ${r.counts.fail} · ` +
          `Blocked ${r.counts.blocked} · Not run ${r.counts.not_run}\n` +
          `Pass rate ${r.passRate}% · Executed ${r.progress}%`
      );
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_report_monthly",
  "Monthly execution report for a given month (YYYY-MM), optionally by project.",
  {
    month: z.string().describe("YYYY-MM"),
    projectKey: z.string().optional(),
  },
  async ({ month, projectKey }) => {
    try {
      let q = `month=${encodeURIComponent(month)}`;
      if (projectKey) q += `&projectId=${encodeURIComponent(await resolveProjectId(projectKey))}`;
      const r = await api(`/api/reports/monthly?${q}`);
      const byTester = r.byTester
        .map((t) => `  ${t.name}: ${t.pass}P/${t.fail}F/${t.blocked}B (${t.passRate}%)`)
        .join("\n");
      return ok(
        `${month}: ${r.totalExecuted} executed · pass rate ${r.passRate}%\n` +
          (byTester || "  (no executions)")
      );
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_report_testers",
  "Per-tester activity (cases created, executions, pass rate), optionally by project.",
  { projectKey: z.string().optional() },
  async ({ projectKey }) => {
    try {
      let path = "/api/reports/testers";
      if (projectKey) path += `?projectId=${encodeURIComponent(await resolveProjectId(projectKey))}`;
      const r = await api(path);
      const lines = r.testers.map(
        (t) =>
          `${t.name}: created ${t.testCasesCreated}, ran ${t.executionsRun} ` +
          `(${t.pass}P/${t.fail}F/${t.blocked}B, ${t.passRate}%)`
      );
      return ok(lines.join("\n") || "No testers.");
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

server.tool(
  "qa_report_jira_coverage",
  "Jira coverage: linked test cases per ticket and their latest result, optionally by project.",
  { projectKey: z.string().optional() },
  async ({ projectKey }) => {
    try {
      let path = "/api/reports/jira-coverage";
      if (projectKey) path += `?projectId=${encodeURIComponent(await resolveProjectId(projectKey))}`;
      const r = await api(path);
      const lines = r.coverage.map(
        (g) =>
          `${g.jiraKey} (${g.linkedCount}): ` +
          g.testCases.map((t) => `${t.key}=${t.latestStatus}`).join(", ")
      );
      return ok(lines.join("\n") || "No test cases linked to Jira.");
    } catch (e) {
      return fail(String(e.message || e));
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("qa-tms MCP server running on stdio");
