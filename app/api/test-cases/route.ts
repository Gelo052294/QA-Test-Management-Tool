import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { testCaseCreateSchema } from "@/lib/validation";

// GET /api/test-cases?projectId=&q=&folder=&jiraKey=&status=
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId")?.trim();
  const q = searchParams.get("q")?.trim();
  const folderId = searchParams.get("folderId")?.trim();
  const jiraKey = searchParams.get("jiraKey")?.trim();
  const status = searchParams.get("status")?.trim();

  const testCases = await prisma.testCase.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(folderId ? { folderId } : {}),
      ...(jiraKey ? { jiraKey } : {}),
      ...(status ? { status: status as any } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { key: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { seq: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return json({ testCases });
}

// POST /api/test-cases
export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = testCaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  // Atomically bump the project's test-case counter to derive the key (PROJ-T<n>).
  const project = await prisma.project
    .update({
      where: { id: parsed.data.projectId },
      data: { tcCounter: { increment: 1 } },
    })
    .catch(() => null);
  if (!project) return notFound("Project not found");

  const testCase = await prisma.testCase.create({
    data: {
      key: `${project.key}-T${project.tcCounter}`,
      projectId: project.id,
      title: parsed.data.title,
      description: parsed.data.description,
      preconditions: parsed.data.preconditions,
      steps: parsed.data.steps,
      priority: parsed.data.priority,
      status: parsed.data.status,
      folderId: parsed.data.folderId || null,
      jiraKey: parsed.data.jiraKey,
      createdById: user.id,
    },
  });

  return json({ testCase }, 201);
}
