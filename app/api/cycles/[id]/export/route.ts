import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiUser, unauthorized, notFound } from "@/lib/apiAuth";
import { buildCycleWorkbook, XLSX_CONTENT_TYPE } from "@/lib/excel";

type Params = { params: Promise<{ id: string }> };

// GET /api/cycles/:id/export -> .xlsx of the cycle's execution results
export async function GET(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const cycle = await prisma.testCycle.findUnique({
    where: { id },
    include: {
      executions: {
        include: {
          testCase: { select: { key: true, title: true } },
          executedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!cycle) return notFound("Cycle not found");

  const count = (s: string) => cycle.executions.filter((e) => e.status === s).length;
  const total = cycle.executions.length;
  const passed = count("pass");
  const failed = count("fail");
  const blocked = count("blocked");
  const notRun = count("not_run");
  const executed = total - notRun;

  const wb = buildCycleWorkbook(
    { name: cycle.name, key: cycle.key },
    {
      total,
      passed,
      failed,
      blocked,
      notRun,
      passRate: executed ? Math.round((passed / executed) * 100) : 0,
    },
    cycle.executions.map((e) => ({
      key: e.testCase.key,
      title: e.testCase.title,
      status: e.status,
      executedBy: e.executedBy?.name ?? "",
      executedAt: e.executedAt ? e.executedAt.toISOString() : "",
      defectJiraKey: e.defectJiraKey ?? "",
      comment: e.comment ?? "",
    }))
  );

  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `${cycle.key ?? "cycle"}-results.xlsx`;
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
