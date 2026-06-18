import { getApiUser, json, unauthorized } from "@/lib/apiAuth";
import { jiraCoverage } from "@/lib/reports";
import { toCsv, csvResponse } from "@/lib/csv";

// GET /api/reports/jira-coverage?format=csv
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const groups = await jiraCoverage();

  if (new URL(req.url).searchParams.get("format") === "csv") {
    const flat = groups.flatMap((g) =>
      g.testCases.map((tc) => ({
        jiraKey: g.jiraKey,
        testCase: tc.key,
        title: tc.title,
        latestStatus: tc.latestStatus,
      }))
    );
    const csv = toCsv(flat, [
      { key: "jiraKey", header: "Jira Key" },
      { key: "testCase", header: "Test Case" },
      { key: "title", header: "Title" },
      { key: "latestStatus", header: "Latest Result" },
    ]);
    return csvResponse(csv, "jira-coverage.csv");
  }

  return json({ coverage: groups });
}
