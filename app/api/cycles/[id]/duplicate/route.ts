import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { cycleDuplicateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// POST /api/cycles/:id/duplicate { name }
// Clones a cycle (same project/folder) under a NEW name with a fresh key.
// Test cases are copied in; their results reset to not_run.
export async function POST(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = cycleDuplicateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const source = await prisma.testCycle.findUnique({
    where: { id },
    include: { executions: { select: { testCaseId: true } } },
  });
  if (!source) return notFound("Cycle not found");
  if (!source.projectId) return badRequest("Cycle has no project");

  // Reject a no-op rename so the copy is meaningfully distinct.
  if (parsed.data.name.trim() === source.name.trim()) {
    return badRequest("Please choose a different name for the copy");
  }

  // New per-project cycle key.
  const project = await prisma.project.update({
    where: { id: source.projectId },
    data: { cyCounter: { increment: 1 } },
  });

  const cycle = await prisma.testCycle.create({
    data: {
      key: `${project.key}-C${project.cyCounter}`,
      projectId: source.projectId,
      folderId: source.folderId,
      name: parsed.data.name.trim(),
      description: source.description,
      status: "active",
      createdById: user.id,
      executions: {
        create: source.executions.map((e) => ({
          testCaseId: e.testCaseId,
          status: "not_run" as const,
        })),
      },
    },
  });

  return json({ cycle }, 201);
}
