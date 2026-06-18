import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { cycleUpdateSchema } from "@/lib/validation";

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

  const existing = await prisma.testCycle.findUnique({ where: { id } });
  if (!existing) return notFound("Cycle not found");

  const cycle = await prisma.testCycle.update({
    where: { id },
    data: parsed.data,
  });
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
