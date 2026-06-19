import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/apiAuth";

// Remote MCP server (Streamable HTTP, stateless) for the QA Test Management Tool.
// Auth: Authorization: Bearer <personal API token>. Each request is a JSON-RPC
// message; tools bridge to the app's own REST API using the same token.

const SERVER_INFO = { name: "qa-tms", version: "1.0.0" };
const PROTOCOL_VERSION = "2024-11-05";

type ToolCtx = {
  origin: string;
  authz: string;
};

async function callApi(ctx: ToolCtx, path: string, init?: RequestInit) {
  const res = await fetch(`${ctx.origin}${path}`, {
    ...init,
    headers: { Authorization: ctx.authz, ...(init?.headers || {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status} ${path}`);
  return data;
}

async function resolveProjectId(ctx: ToolCtx, key: string) {
  const { projects } = await callApi(ctx, "/api/projects");
  const p = projects.find((x: any) => x.key.toLowerCase() === key.toLowerCase());
  if (!p) throw new Error(`Project "${key}" not found`);
  return p.id as string;
}

async function resolveCycle(ctx: ToolCtx, key: string) {
  const { cycles } = await callApi(ctx, "/api/cycles");
  const c = cycles.find((x: any) => (x.key || "").toLowerCase() === key.toLowerCase());
  if (!c) throw new Error(`Cycle "${key}" not found`);
  return c;
}

async function resolveExecution(ctx: ToolCtx, cycleKey: string, tcKey: string) {
  const cycle = await resolveCycle(ctx, cycleKey);
  const full = await callApi(ctx, `/api/cycles/${cycle.id}`);
  const exec = full.cycle.executions.find(
    (e: any) => e.testCase.key.toLowerCase() === tcKey.toLowerCase()
  );
  if (!exec) throw new Error(`Test case "${tcKey}" is not in cycle "${cycleKey}"`);
  return { cycle, exec };
}

type Tool = {
  description: string;
  inputSchema: Record<string, unknown>;
  run: (args: any, ctx: ToolCtx) => Promise<string>;
};

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
});
const str = (description?: string) => ({ type: "string", ...(description ? { description } : {}) });

const TOOLS: Record<string, Tool> = {
  qa_list_projects: {
    description: "List projects (key — name).",
    inputSchema: obj({}),
    run: async (_a, ctx) => {
      const { projects } = await callApi(ctx, "/api/projects");
      return projects.map((p: any) => `${p.key} — ${p.name}`).join("\n") || "No projects.";
    },
  },
  qa_list_cycles: {
    description: "List test cycles, optionally filtered by projectKey.",
    inputSchema: obj({ projectKey: str("e.g. AUR (omit for all)") }),
    run: async (a, ctx) => {
      let path = "/api/cycles";
      if (a.projectKey) path += `?projectId=${encodeURIComponent(await resolveProjectId(ctx, a.projectKey))}`;
      const { cycles } = await callApi(ctx, path);
      return cycles.map((c: any) => `${c.key || "(no key)"} — ${c.name} [${c.status}]`).join("\n") || "No cycles.";
    },
  },
  qa_list_cycle_tests: {
    description: "List a cycle's test cases with current results.",
    inputSchema: obj({ cycleKey: str("e.g. AUR-C1") }, ["cycleKey"]),
    run: async (a, ctx) => {
      const cycle = await resolveCycle(ctx, a.cycleKey);
      const full = await callApi(ctx, `/api/cycles/${cycle.id}`);
      const lines = full.cycle.executions.map(
        (e: any) => `${e.testCase.key}  ${e.status}` + (e.executedBy ? `  (by ${e.executedBy.name})` : "")
      );
      return `${cycle.key} — ${cycle.name}\n${lines.join("\n") || "No test cases."}`;
    },
  },
  qa_set_result: {
    description: "Record a test execution result for a test case in a cycle.",
    inputSchema: obj(
      {
        cycleKey: str("e.g. AUR-C1"),
        testCaseKey: str("e.g. AUR-T1"),
        status: { type: "string", enum: ["not_run", "pass", "fail", "blocked"] },
        comment: str(),
        defectJiraKey: str("e.g. PROJ-123"),
      },
      ["cycleKey", "testCaseKey", "status"]
    ),
    run: async (a, ctx) => {
      const { exec } = await resolveExecution(ctx, a.cycleKey, a.testCaseKey);
      await callApi(ctx, `/api/executions/${exec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: a.status, comment: a.comment, defectJiraKey: a.defectJiraKey }),
      });
      return `Recorded ${a.testCaseKey} = ${a.status} in ${a.cycleKey}.`;
    },
  },
  qa_create_test_case: {
    description: "Create a test case in a project.",
    inputSchema: obj(
      {
        projectKey: str("e.g. AUR"),
        title: str(),
        priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
        status: { type: "string", enum: ["draft", "active", "deprecated"] },
        description: str(),
        preconditions: str(),
        jiraKey: str("e.g. PROJ-123"),
        steps: {
          type: "array",
          items: obj({ step: str(), expectedResult: str() }, ["step"]),
        },
      },
      ["projectKey", "title"]
    ),
    run: async (a, ctx) => {
      const projectId = await resolveProjectId(ctx, a.projectKey);
      const { testCase } = await callApi(ctx, "/api/test-cases", {
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
      return `Created ${testCase.key}: ${testCase.title}`;
    },
  },
  qa_create_cycle: {
    description: "Create a test cycle (start/end dates required, YYYY-MM-DD).",
    inputSchema: obj(
      {
        projectKey: str("e.g. AUR"),
        name: str(),
        startDate: str("YYYY-MM-DD"),
        endDate: str("YYYY-MM-DD"),
        description: str(),
      },
      ["projectKey", "name", "startDate", "endDate"]
    ),
    run: async (a, ctx) => {
      const projectId = await resolveProjectId(ctx, a.projectKey);
      const { cycle } = await callApi(ctx, "/api/cycles", {
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
      return `Created cycle ${cycle.key}: ${cycle.name}`;
    },
  },
  qa_add_tests_to_cycle: {
    description: "Add test cases (by key) to a cycle.",
    inputSchema: obj(
      { cycleKey: str("e.g. AUR-C1"), testCaseKeys: { type: "array", items: str() } },
      ["cycleKey", "testCaseKeys"]
    ),
    run: async (a, ctx) => {
      const cycle = await resolveCycle(ctx, a.cycleKey);
      const { testCases } = await callApi(ctx, `/api/test-cases?projectId=${cycle.projectId}`);
      const byKey = new Map(testCases.map((t: any) => [t.key.toLowerCase(), t.id]));
      const ids: string[] = [];
      const missing: string[] = [];
      for (const k of a.testCaseKeys) {
        const id = byKey.get(String(k).toLowerCase());
        if (id) ids.push(id as string);
        else missing.push(k);
      }
      if (!ids.length) return `No matching test cases: ${missing.join(", ")}`;
      const res = await callApi(ctx, `/api/cycles/${cycle.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCaseIds: ids }),
      });
      return `Added ${res.added} to ${a.cycleKey}.` + (missing.length ? ` Not found: ${missing.join(", ")}.` : "");
    },
  },
  qa_upload_evidence: {
    description:
      "Upload an evidence file (provided as base64) to a test execution. The agent should read the file and pass its base64 content.",
    inputSchema: obj(
      {
        cycleKey: str("e.g. AUR-C1"),
        testCaseKey: str("e.g. AUR-T1"),
        fileName: str("e.g. screenshot.png"),
        contentBase64: str("base64-encoded file bytes"),
      },
      ["cycleKey", "testCaseKey", "fileName", "contentBase64"]
    ),
    run: async (a, ctx) => {
      const { exec } = await resolveExecution(ctx, a.cycleKey, a.testCaseKey);
      const bytes = Buffer.from(a.contentBase64, "base64");
      const form = new FormData();
      form.append("file", new Blob([bytes]), a.fileName);
      const res = await fetch(`${ctx.origin}/api/executions/${exec.id}/evidence`, {
        method: "POST",
        headers: { Authorization: ctx.authz },
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);
      return `Uploaded ${a.fileName} to ${a.testCaseKey} in ${a.cycleKey}.`;
    },
  },
  qa_report_cycle_summary: {
    description: "Pass/fail summary for a cycle.",
    inputSchema: obj({ cycleKey: str("e.g. AUR-C1") }, ["cycleKey"]),
    run: async (a, ctx) => {
      const cycle = await resolveCycle(ctx, a.cycleKey);
      const r = await callApi(ctx, `/api/reports/cycle-summary?cycleId=${cycle.id}`);
      return (
        `${cycle.key} — ${r.cycle.name}\n` +
        `Total ${r.total} · Pass ${r.counts.pass} · Fail ${r.counts.fail} · Blocked ${r.counts.blocked} · Not run ${r.counts.not_run}\n` +
        `Pass rate ${r.passRate}% · Executed ${r.progress}%`
      );
    },
  },
};

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleMessage(msg: any, ctx: ToolCtx) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg?.id ?? null, -32600, "Invalid Request");
  }
  const { id, method, params } = msg;
  const isNotification = id === undefined;

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });
    case "notifications/initialized":
    case "notifications/cancelled":
      return null; // notifications get no response
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, {
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case "tools/call": {
      const tool = TOOLS[params?.name];
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${params?.name}`);
      try {
        const text = await tool.run(params.arguments ?? {}, ctx);
        return rpcResult(id, { content: [{ type: "text", text }] });
      } catch (e: any) {
        return rpcResult(id, {
          content: [{ type: "text", text: String(e?.message || e) }],
          isError: true,
        });
      }
    }
    default:
      return isNotification ? null : rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } },
      { status: 401 }
    );
  }

  const ctx: ToolCtx = {
    origin: new URL(req.url).origin,
    authz: req.headers.get("authorization") || "",
  };

  const body = await req.json().catch(() => null);
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleMessage(m, ctx)))).filter(Boolean);
    return out.length ? NextResponse.json(out) : new NextResponse(null, { status: 202 });
  }
  const res = await handleMessage(body, ctx);
  return res ? NextResponse.json(res) : new NextResponse(null, { status: 202 });
}

// No server-initiated stream needed for this stateless server.
export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
