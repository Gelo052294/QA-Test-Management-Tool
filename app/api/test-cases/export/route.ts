import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, unauthorized, badRequest, notFound } from "@/lib/apiAuth";
import { buildTestCaseWorkbook, XLSX_CONTENT_TYPE, Step } from "@/lib/excel";

// GET /api/test-cases/export?projectId=...  -> .xlsx download
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const projectId = new URL(req.url).searchParams.get("projectId")?.trim();
  if (!projectId) return badRequest("projectId is required");

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return notFound("Project not found");

  const testCases = await prisma.testCase.findMany({
    where: { projectId },
    orderBy: { seq: "asc" },
    include: { createdBy: { select: { name: true } } },
  });

  const wb = buildTestCaseWorkbook(
    `${project.key} — ${project.name}`,
    testCases.map((tc) => ({
      key: tc.key,
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions,
      priority: tc.priority,
      status: tc.status,
      folder: tc.folder,
      jiraKey: tc.jiraKey,
      steps: (tc.steps as unknown as Step[]) ?? [],
      createdBy: tc.createdBy.name,
    }))
  );

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${project.key}-test-cases.xlsx"`,
    },
  });
}
