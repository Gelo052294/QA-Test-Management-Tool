import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { executionUpdateSchema } from "@/lib/validation";
import { recordCycleHistory, HistoryEntry } from "@/lib/history";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/executions/:id  -> record a result
export async function PATCH(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = executionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.testExecution.findUnique({
    where: { id },
    include: {
      testCase: { select: { key: true } },
      executedBy: { select: { name: true } },
    },
  });
  if (!existing) return notFound("Execution not found");

  const ran = parsed.data.status !== "not_run";
  const execution = await prisma.testExecution.update({
    where: { id },
    data: {
      status: parsed.data.status,
      comment: parsed.data.comment,
      defectJiraKey: parsed.data.defectJiraKey,
      // Stamp executor + timestamp when a real result is recorded.
      executedById: ran ? user.id : null,
      executedAt: ran ? new Date() : null,
    },
  });

  // Audit log on the parent cycle (Zephyr-style).
  const key = existing.testCase.key;
  const entries: HistoryEntry[] = [
    { field: `Result (${key})`, oldValue: existing.status, newValue: execution.status },
    {
      field: `Executed by (${key})`,
      oldValue: existing.executedBy?.name ?? "-",
      newValue: ran ? user.name : "-",
    },
  ];
  await recordCycleHistory(existing.cycleId, user.id, entries);

  return json({ execution });
}

// DELETE /api/executions/:id -> remove a test case from the cycle
export async function DELETE(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const existing = await prisma.testExecution.findUnique({ where: { id } });
  if (!existing) return notFound("Execution not found");

  await prisma.testExecution.delete({ where: { id } });
  return json({ ok: true });
}
