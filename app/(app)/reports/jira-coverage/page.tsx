import Link from "next/link";
import { jiraCoverage } from "@/lib/reports";
import { ExecutionStatusBadge } from "@/components/Badges";
import JiraLink from "@/components/JiraLink";
import PrintButton from "@/components/PrintButton";
import EmptyProject from "@/components/EmptyProject";
import { getCurrentProject } from "@/lib/project";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function JiraCoverageReportPage() {
  const user = await requireUser();
  const project = await getCurrentProject();
  if (!project) return <EmptyProject isAdmin={user.role === "admin"} />;

  const coverage = await jiraCoverage(project.id);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-sm text-muted hover:underline">
            ← Reports
          </Link>
          <h1 className="mt-1 text-xl font-bold">
            Jira coverage <span className="text-sm font-normal text-muted">· {project.key}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 no-print">
          <a href={`/api/reports/jira-coverage?projectId=${project.id}&format=csv`} className="btn-secondary">
            Export CSV
          </a>
          <PrintButton />
        </div>
      </div>

      {coverage.length === 0 ? (
        <p className="text-muted">No test cases are linked to Jira tickets yet.</p>
      ) : (
        <div className="space-y-4">
          {coverage.map((g) => (
            <div key={g.jiraKey} className="card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">
                  <JiraLink jiraKey={g.jiraKey} />
                </h2>
                <span className="text-sm text-muted">
                  {g.linkedCount} linked test case{g.linkedCount === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="divide-y divide-line text-sm">
                {g.testCases.map((tc) => (
                  <li key={tc.key} className="flex items-center justify-between py-2">
                    <span>
                      <span className="font-mono text-xs text-faint">{tc.key}</span> {tc.title}
                    </span>
                    <ExecutionStatusBadge value={tc.latestStatus} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
