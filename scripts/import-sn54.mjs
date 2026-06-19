/**
 * One-off importer: parse SN-54 test-cases.md and create the test cases in the
 * tool via the REST API, under project SN, folder "SN-54" with a subfolder per
 * section. Tags each with Jira key SN-54.
 *
 * Env: QATMS_BASE_URL, QATMS_API_TOKEN, SOURCE (path to test-cases.md)
 */
import { readFile } from "node:fs/promises";

const BASE = (process.env.QATMS_BASE_URL || "").replace(/\/$/, "");
const TOKEN = process.env.QATMS_API_TOKEN || "";
const SOURCE = process.env.SOURCE;
const PROJECT_KEY = process.env.PROJECT_KEY || "SN";
const ROOT_FOLDER = process.env.ROOT_FOLDER || "SN-54";
const JIRA_KEY = process.env.JIRA_KEY || "SN-54";

if (!BASE || !TOKEN || !SOURCE) {
  console.error("Need QATMS_BASE_URL, QATMS_API_TOKEN, SOURCE env vars");
  process.exit(1);
}
const auth = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...auth, ...(init?.headers || {}) } });
  const t = await res.text();
  const d = t ? JSON.parse(t) : {};
  if (!res.ok) throw new Error(d?.error || `HTTP ${res.status} ${path}`);
  return d;
}

const PRIORITY = { low: "low", medium: "medium", high: "high", critical: "critical" };

function collectList(lines, startIdx, numbered) {
  const out = [];
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l === "" ) { if (out.length) break; else continue; }
    if (l.startsWith("**") || l === "---" || l.startsWith("#")) break;
    if (numbered) {
      const m = l.match(/^\d+[.)]\s*(.+)/);
      if (m) out.push(m[1]);
      else if (out.length) break;
    } else {
      const m = l.match(/^[-*]\s*(.+)/);
      if (m) out.push(m[1]);
      else if (out.length) break;
    }
  }
  return out;
}

function field(block, name) {
  const re = new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`, "i");
  for (const l of block) {
    const m = l.match(re);
    if (m) return m[1].trim();
  }
  return "";
}

function listAfter(block, name, numbered) {
  const idx = block.findIndex((l) => new RegExp(`\\*\\*${name}:\\*\\*`, "i").test(l.trim()));
  if (idx === -1) return [];
  return collectList(block, idx + 1, numbered);
}

async function main() {
  const md = await readFile(SOURCE, "utf8");
  const lines = md.split(/\r?\n/);

  // Parse into TC blocks with their section.
  const tcs = [];
  let section = "Uncategorized";
  let cur = null;
  for (const line of lines) {
    const sec = line.match(/^##\s+Section\s+\d+\s*[—-]\s*(.+)/i) || line.match(/^##\s+(.+)/);
    const tc = line.match(/^###\s+(TC-\d+):\s*(.+)/);
    if (tc) {
      if (cur) tcs.push(cur);
      cur = { id: tc[1], title: tc[2].trim(), section, body: [] };
    } else if (line.startsWith("## ") && sec && !line.startsWith("###")) {
      // section header (skip Summary/Required Test Data which aren't TC sections)
      section = sec[1].trim();
      if (cur) { tcs.push(cur); cur = null; }
    } else if (cur) {
      cur.body.push(line);
    }
  }
  if (cur) tcs.push(cur);

  console.log(`Parsed ${tcs.length} test cases`);

  if (process.env.DRYRUN) {
    const bySection = {};
    for (const tc of tcs) bySection[tc.section] = (bySection[tc.section] || 0) + 1;
    console.log("Sections:", JSON.stringify(bySection, null, 2));
    const s = tcs[0];
    console.log("\nSample first TC:");
    console.log("  title:", `${s.id}: ${s.title}`);
    console.log("  priority:", field(s.body, "Priority"));
    console.log("  preconditions:", listAfter(s.body, "Preconditions", false));
    console.log("  steps:", listAfter(s.body, "Steps", true));
    console.log("  expected:", listAfter(s.body, "Expected Results", false));
    return;
  }

  // Resolve project.
  const { projects } = await api("/api/projects");
  const project = projects.find((p) => p.key === PROJECT_KEY);
  if (!project) throw new Error(`Project ${PROJECT_KEY} not found`);

  // Create/reuse the root folder.
  const existing = await api(`/api/folders?projectId=${project.id}&kind=testcase`);
  let root = existing.folders.find((f) => f.name === ROOT_FOLDER && !f.parentId);
  if (!root) {
    root = (await api("/api/folders", {
      method: "POST",
      body: JSON.stringify({ projectId: project.id, kind: "testcase", name: ROOT_FOLDER }),
    })).folder;
  }

  // Create section subfolders (cache by name).
  const sectionFolders = new Map();
  for (const f of (await api(`/api/folders?projectId=${project.id}&kind=testcase`)).folders) {
    if (f.parentId === root.id) sectionFolders.set(f.name, f.id);
  }
  async function folderFor(sectionName) {
    const name = sectionName.slice(0, 80);
    if (sectionFolders.has(name)) return sectionFolders.get(name);
    const folder = (await api("/api/folders", {
      method: "POST",
      body: JSON.stringify({ projectId: project.id, kind: "testcase", name, parentId: root.id }),
    })).folder;
    sectionFolders.set(name, folder.id);
    return folder.id;
  }

  let created = 0;
  for (const tc of tcs) {
    const folderId = await folderFor(tc.section);
    const priority = PRIORITY[field(tc.body, "Priority").toLowerCase()] || "medium";
    const preconditions = listAfter(tc.body, "Preconditions", false).join("\n");
    const stepLines = listAfter(tc.body, "Steps", true);
    const expected = listAfter(tc.body, "Expected Results", false);
    const type = field(tc.body, "Type");
    const execution = field(tc.body, "Execution");
    const scenario = field(tc.body, "Scenario Type");
    const traces = field(tc.body, "Traces To");

    const descParts = [];
    if (type) descParts.push(`Type: ${type}`);
    if (execution) descParts.push(`Execution: ${execution}`);
    if (scenario) descParts.push(`Scenario: ${scenario}`);
    if (traces) descParts.push(`Traces To: ${traces}`);
    let description = `[${tc.id}] ` + descParts.join(" | ");
    if (expected.length) description += `\n\nExpected Results:\n` + expected.map((e) => `- ${e}`).join("\n");

    // Pair steps with expected results positionally; extras appended to last step.
    const steps = stepLines.map((s, i) => ({ step: s, expectedResult: expected[i] ?? "" }));

    await api("/api/test-cases", {
      method: "POST",
      body: JSON.stringify({
        projectId: project.id,
        title: `${tc.id}: ${tc.title}`,
        description,
        preconditions,
        steps,
        priority,
        status: "active",
        folderId,
        jiraKey: JIRA_KEY,
      }),
    });
    created++;
    if (created % 10 === 0) console.log(`  created ${created}/${tcs.length}`);
  }

  console.log(`Done. Created ${created} test cases in ${PROJECT_KEY}/${ROOT_FOLDER} across ${sectionFolders.size} sections.`);
}

main().catch((e) => {
  console.error("Import failed:", e.message || e);
  process.exit(1);
});
