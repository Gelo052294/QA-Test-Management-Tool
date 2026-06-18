import { getApiUser, json, unauthorized, badRequest, notFound } from "@/lib/apiAuth";
import { cycleSummary } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

// GET /api/reports/cycle-summary?cycleId=...&format=csv
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  if (!cycleId) return badRequest("cycleId is required");

  const report = await cycleSummary(cycleId);
  if (!report) return notFound("Cycle not found");

  if (searchParams.get("format") === "csv") {
    const csv = toCsv(report.rows, [
      { key: "key", header: "Test Case" },
      { key: "title", header: "Title" },
      { key: "status", header: "Result" },
      { key: "executedBy", header: "Executed By" },
      { key: "executedAt", header: "Executed At" },
      { key: "defectJiraKey", header: "Defect" },
      { key: "comment", header: "Comment" },
    ]);
    return csvResponse(csv, `cycle-${cycleId}-summary.csv`);
  }

  return json(report);
}
