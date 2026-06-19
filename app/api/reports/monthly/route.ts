import { getApiUser, json, unauthorized, badRequest } from "@/lib/apiAuth";
import { monthlyReport } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

// GET /api/reports/monthly?month=YYYY-MM&format=csv
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return badRequest("month is required in YYYY-MM format");
  }
  const projectId = searchParams.get("projectId")?.trim() || undefined;

  const report = await monthlyReport(month, projectId);

  if (searchParams.get("format") === "csv") {
    const csv = toCsv(report.rows, [
      { key: "executedAt", header: "Executed At" },
      { key: "key", header: "Test Case" },
      { key: "title", header: "Title" },
      { key: "cycle", header: "Cycle" },
      { key: "status", header: "Result" },
      { key: "executedBy", header: "Executed By" },
    ]);
    return csvResponse(csv, `monthly-${month}.csv`);
  }

  return json(report);
}
