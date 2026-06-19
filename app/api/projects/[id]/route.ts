import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  forbidden,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { projectUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { _count: { select: { testCases: true, cycles: true } } },
  });
  if (!project) return notFound("Project not found");
  return json({ project });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden("Only admins can edit projects");
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return notFound("Project not found");

  const project = await prisma.project.update({ where: { id }, data: parsed.data });
  return json({ project });
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden("Only admins can delete projects");
  const { id } = await params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return notFound("Project not found");

  // Cascades to the project's test cases and cycles (and their executions/evidence).
  await prisma.project.delete({ where: { id } });
  return json({ ok: true });
}
