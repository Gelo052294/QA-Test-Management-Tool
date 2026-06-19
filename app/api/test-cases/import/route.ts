import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { parseStepsCell } from "@/lib/excel";

const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["draft", "active", "deprecated"];

function pick<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  const v = String(value ?? "").trim().toLowerCase();
  return (allowed as string[]).includes(v) ? (v as T) : fallback;
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value && "text" in (value as any)) {
    return String((value as any).text ?? "").trim();
  }
  return String(value).trim();
}

// POST /api/test-cases/import  (multipart: file, projectId)
export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const projectId = String(form?.get("projectId") ?? "").trim();
  if (!projectId) return badRequest("projectId is required");
  if (!(file instanceof File)) return badRequest("Expected a 'file' field");

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return notFound("Project not found");

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    return badRequest("Could not read the Excel file");
  }
  const ws = wb.worksheets[0];
  if (!ws) return badRequest("The workbook has no sheets");

  // Map header row -> column index (case-insensitive).
  const header = ws.getRow(1);
  const col: Record<string, number> = {};
  header.eachCell((cell, i) => {
    col[cellText(cell.value).toLowerCase()] = i;
  });
  if (!col["title"]) {
    return badRequest("Missing required 'Title' column in the first row");
  }

  const get = (row: ExcelJS.Row, name: string) =>
    col[name] ? cellText(row.getCell(col[name]).value) : "";

  const parsed: {
    title: string;
    description: string;
    preconditions: string;
    priority: string;
    status: string;
    folder: string;
    jiraKey: string;
    steps: unknown;
  }[] = [];
  const errors: string[] = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const title = get(row, "title");
    if (!title) return; // skip blank/footer rows
    parsed.push({
      title,
      description: get(row, "description"),
      preconditions: get(row, "preconditions"),
      priority: pick(get(row, "priority"), PRIORITIES, "medium"),
      status: pick(get(row, "status"), STATUSES, "active"),
      folder: get(row, "folder"),
      jiraKey: get(row, "jira key"),
      steps: parseStepsCell(get(row, "steps")),
    });
  });

  if (parsed.length === 0) {
    return badRequest("No rows with a Title were found to import");
  }

  // Reserve a contiguous block of per-project numbers, then bulk-create.
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { tcCounter: { increment: parsed.length } },
  });
  const base = updated.tcCounter - parsed.length;

  const result = await prisma.testCase.createMany({
    data: parsed.map((p, i) => ({
      key: `${project.key}-T${base + i + 1}`,
      projectId,
      title: p.title,
      description: p.description || null,
      preconditions: p.preconditions || null,
      priority: p.priority as any,
      status: p.status as any,
      folder: p.folder || null,
      jiraKey: p.jiraKey || null,
      steps: p.steps as any,
      createdById: user.id,
    })),
  });

  return json({ imported: result.count, errors }, 201);
}
