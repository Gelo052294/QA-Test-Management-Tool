import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  forbidden,
  badRequest,
} from "@/lib/apiAuth";
import { projectCreateSchema } from "@/lib/validation";

// GET /api/projects — list all projects
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { testCases: true, cycles: true } },
    },
  });
  return json({ projects });
}

// POST /api/projects — create a project (admin only)
export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden("Only admins can create projects");

  const body = await req.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.project.findUnique({
    where: { key: parsed.data.key },
  });
  if (existing) return badRequest(`Project key "${parsed.data.key}" already exists`);

  const project = await prisma.project.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description,
      createdById: user.id,
    },
  });
  return json({ project }, 201);
}
