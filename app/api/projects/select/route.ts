import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getApiUser, json, unauthorized, badRequest } from "@/lib/apiAuth";
import { PROJECT_COOKIE } from "@/lib/project";

// POST /api/projects/select { projectId } — set the working project (cookie)
export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const projectId = body?.projectId;
  if (!projectId || typeof projectId !== "string") {
    return badRequest("projectId is required");
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return badRequest("Unknown project");

  const store = await cookies();
  store.set(PROJECT_COOKIE, projectId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return json({ ok: true });
}
