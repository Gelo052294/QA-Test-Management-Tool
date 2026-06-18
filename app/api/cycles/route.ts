import { prisma } from "@/lib/db";
import { getApiUser, json, unauthorized, badRequest } from "@/lib/apiAuth";
import { cycleCreateSchema } from "@/lib/validation";

// GET /api/cycles
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const cycles = await prisma.testCycle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { executions: true } },
    },
  });
  return json({ cycles });
}

// POST /api/cycles
export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = cycleCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const cycle = await prisma.testCycle.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      createdById: user.id,
    },
  });
  return json({ cycle }, 201);
}
