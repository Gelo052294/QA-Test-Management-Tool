import { NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { buildTestCaseTemplate, XLSX_CONTENT_TYPE } from "@/lib/excel";

// GET /api/test-cases/template -> blank .xlsx import template
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const wb = buildTestCaseTemplate();
  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="test-cases-template.xlsx"`,
    },
  });
}
