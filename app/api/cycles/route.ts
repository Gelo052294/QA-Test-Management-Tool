import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { cycleCreateSchema } from "@/lib/validation";

// GET /api/cycles?projectId=
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const projectId = new URL(req.url).searchParams.get("projectId")?.trim();

  const cycles = await prisma.testCycle.findMany({
    where: projectId ? { projectId } : {},
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

  // Atomically bump the project's cycle counter to derive the key (PROJ-C<n>).
  const project = await prisma.project
    .update({
      where: { id: parsed.data.projectId },
      data: { cyCounter: { increment: 1 } },
    })
    .catch(() => null);
  if (!project) return notFound("Project not found");

  const cycle = await prisma.testCycle.create({
    data: {
      key: `${project.key}-C${project.cyCounter}`,
      projectId: project.id,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      folderId: parsed.data.folderId || null,
      createdById: user.id,
    },
  });
  return json({ cycle }, 201);
}
