import { getApiUser, json, unauthorized } from "@/lib/apiAuth";
import { testerActivity } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

// GET /api/reports/testers?format=csv
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const rows = await testerActivity();

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const csv = toCsv(rows, [
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "testCasesCreated", header: "Test Cases Created" },
      { key: "executionsRun", header: "Executions Run" },
      { key: "pass", header: "Passed" },
      { key: "fail", header: "Failed" },
      { key: "blocked", header: "Blocked" },
      { key: "passRate", header: "Pass Rate %" },
    ]);
    return csvResponse(csv, "tester-activity.csv");
  }

  return json({ testers: rows });
}
