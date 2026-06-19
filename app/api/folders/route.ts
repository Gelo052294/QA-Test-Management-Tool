import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { folderCreateSchema } from "@/lib/validation";

// GET /api/folders?projectId=&kind=
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId")?.trim();
  const kind = searchParams.get("kind")?.trim();
  if (!projectId || (kind !== "testcase" && kind !== "cycle")) {
    return badRequest("projectId and kind (testcase|cycle) are required");
  }

  const folders = await prisma.folder.findMany({
    where: { projectId, kind },
    orderBy: { name: "asc" },
    select: { id: true, name: true, parentId: true },
  });
  return json({ folders });
}

// POST /api/folders { projectId, kind, name, parentId? }
export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = folderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
  if (!project) return notFound("Project not found");

  // A parent (if given) must be a folder of the same project + kind.
  if (parsed.data.parentId) {
    const parent = await prisma.folder.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.projectId !== parsed.data.projectId || parent.kind !== parsed.data.kind) {
      return badRequest("Invalid parent folder");
    }
  }

  const folder = await prisma.folder.create({
    data: {
      projectId: parsed.data.projectId,
      kind: parsed.data.kind,
      name: parsed.data.name,
      parentId: parsed.data.parentId || null,
    },
  });
  return json({ folder }, 201);
}
