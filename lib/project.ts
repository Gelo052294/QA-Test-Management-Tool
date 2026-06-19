import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const PROJECT_COOKIE = "projectId";

/** All projects, for switchers and lists. */
export function listProjects() {
  return prisma.project.findMany({ orderBy: { createdAt: "asc" } });
}

/**
 * Resolve the working project for the current request (server components):
 * the cookie selection if valid, otherwise the oldest project, otherwise null.
 */
export async function getCurrentProject() {
  const store = await cookies();
  const cookieId = store.get(PROJECT_COOKIE)?.value;

  if (cookieId) {
    const byCookie = await prisma.project.findUnique({ where: { id: cookieId } });
    if (byCookie) return byCookie;
  }
  return prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
}
