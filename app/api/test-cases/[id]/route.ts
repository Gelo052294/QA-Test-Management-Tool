import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { testCaseUpdateSchema } from "@/lib/validation";
import { recordTestCaseHistory, stepsToText, HistoryEntry } from "@/lib/history";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const testCase = await prisma.testCase.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      executions: {
        include: { cycle: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!testCase) return notFound("Test case not found");
  return json({ testCase });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = testCaseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.testCase.findUnique({
    where: { id },
    include: { folderRef: { select: { name: true } } },
  });
  if (!existing) return notFound("Test case not found");

  const d = parsed.data;
  const testCase = await prisma.testCase.update({ where: { id }, data: d });

  // Resolve the new folder name if the folder changed.
  let newFolderName = existing.folderRef?.name ?? "-";
  if (d.folderId !== undefined && d.folderId !== existing.folderId) {
    newFolderName = d.folderId
      ? (await prisma.folder.findUnique({ where: { id: d.folderId } }))?.name ?? "-"
      : "-";
  }

  const entries: HistoryEntry[] = [];
  if (d.title !== undefined) entries.push({ field: "Title", oldValue: existing.title, newValue: testCase.title });
  if (d.description !== undefined)
    entries.push({ field: "Description", oldValue: existing.description ?? "-", newValue: testCase.description ?? "-" });
  if (d.preconditions !== undefined)
    entries.push({ field: "Preconditions", oldValue: existing.preconditions ?? "-", newValue: testCase.preconditions ?? "-" });
  if (d.priority !== undefined) entries.push({ field: "Priority", oldValue: existing.priority, newValue: testCase.priority });
  if (d.status !== undefined) entries.push({ field: "Status", oldValue: existing.status, newValue: testCase.status });
  if (d.jiraKey !== undefined)
    entries.push({ field: "Jira Key", oldValue: existing.jiraKey ?? "-", newValue: testCase.jiraKey ?? "-" });
  if (d.folderId !== undefined)
    entries.push({ field: "Folder", oldValue: existing.folderRef?.name ?? "-", newValue: newFolderName });
  if (d.steps !== undefined)
    entries.push({ field: "Steps", oldValue: stepsToText(existing.steps), newValue: stepsToText(testCase.steps) });

  await recordTestCaseHistory(id, user.id, entries);
  return json({ testCase });
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const existing = await prisma.testCase.findUnique({ where: { id } });
  if (!existing) return notFound("Test case not found");

  await prisma.testCase.delete({ where: { id } });
  return json({ ok: true });
}
