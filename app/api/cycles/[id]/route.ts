import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { cycleUpdateSchema } from "@/lib/validation";
import { recordCycleHistory, histDate, HistoryEntry } from "@/lib/history";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const cycle = await prisma.testCycle.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      executions: {
        include: {
          testCase: true,
          executedBy: { select: { name: true } },
          evidence: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!cycle) return notFound("Cycle not found");
  return json({ cycle });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = cycleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.testCycle.findUnique({
    where: { id },
    include: { folderRef: { select: { name: true } } },
  });
  if (!existing) return notFound("Cycle not found");

  const d = parsed.data;
  const cycle = await prisma.testCycle.update({ where: { id }, data: d });

  // Resolve the new folder name if the folder changed.
  let newFolderName = existing.folderRef?.name ?? "-";
  if (d.folderId !== undefined && d.folderId !== existing.folderId) {
    newFolderName = d.folderId
      ? (await prisma.folder.findUnique({ where: { id: d.folderId } }))?.name ?? "-"
      : "-";
  }

  const entries: HistoryEntry[] = [];
  if (d.name !== undefined) entries.push({ field: "Name", oldValue: existing.name, newValue: cycle.name });
  if (d.status !== undefined) entries.push({ field: "Status", oldValue: existing.status, newValue: cycle.status });
  if (d.startDate !== undefined)
    entries.push({ field: "Planned Start Date", oldValue: histDate(existing.startDate), newValue: histDate(cycle.startDate) });
  if (d.endDate !== undefined)
    entries.push({ field: "Planned End Date", oldValue: histDate(existing.endDate), newValue: histDate(cycle.endDate) });
  if (d.folderId !== undefined)
    entries.push({ field: "Folder", oldValue: existing.folderRef?.name ?? "-", newValue: newFolderName });

  await recordCycleHistory(id, user.id, entries);
  return json({ cycle });
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const existing = await prisma.testCycle.findUnique({ where: { id } });
  if (!existing) return notFound("Cycle not found");

  await prisma.testCycle.delete({ where: { id } });
  return json({ ok: true });
}
