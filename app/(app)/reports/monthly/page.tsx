import Link from "next/link";
import { monthlyReport } from "@/lib/reports";
import { ExecutionStatusBadge } from "@/components/Badges";
import MonthPicker from "@/components/MonthPicker";
import PrintButton from "@/components/PrintButton";
import EmptyProject from "@/components/EmptyProject";
import { getCurrentProject } from "@/lib/project";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject();
  if (!project) return <EmptyProject isAdmin={user.role === "admin"} />;

  const { month: monthParam } = await searchParams;
  const now = new Date();
  const month =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const report = await monthlyReport(month, project.id);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/reports" className="text-sm text-muted hover:underline">
            ← Reports
          </Link>
          <h1 className="mt-1 text-xl font-bold">
            Monthly execution report{" "}
            <span className="text-sm font-normal text-muted">· {project.key} · {month}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 no-print">
          <MonthPicker month={month} />
          <a href={`/api/reports/monthly?month=${month}&projectId=${project.id}&format=csv`} className="btn-secondary">
            Export CSV
          </a>
          <PrintButton />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="card text-center">
          <div className="text-2xl font-bold text-ink">{report.totalExecuted}</div>
          <div className="text-xs text-muted">Executed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-pos">{report.counts.pass}</div>
          <div className="text-xs text-muted">Passed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-neg">{report.counts.fail}</div>
          <div className="text-xs text-muted">Failed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-warn">{report.counts.blocked}</div>
          <div className="text-xs text-muted">Blocked</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand">{report.passRate}%</div>
          <div className="text-xs text-muted">Pass rate</div>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="mb-3 font-semibold">By tester</h2>
        {report.byTester.length === 0 ? (
          <p className="text-sm text-muted">No executions this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted">
              <tr>
                <th className="py-2">Tester</th>
                <th className="py-2">Passed</th>
                <th className="py-2">Failed</th>
                <th className="py-2">Blocked</th>
                <th className="py-2">Pass rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {report.byTester.map((t) => (
                <tr key={t.name}>
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.pass}</td>
                  <td className="py-2">{t.fail}</td>
                  <td className="py-2">{t.blocked}</td>
                  <td className="py-2">{t.passRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-subtle text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Executed at</th>
              <th className="px-4 py-3">Test Case</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Executed by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {report.rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-3 text-muted">
                  {r.executedAt ? new Date(r.executedAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-faint">{r.key}</span> {r.title}
                </td>
                <td className="px-4 py-3 text-muted">{r.cycle}</td>
                <td className="px-4 py-3">
                  <ExecutionStatusBadge value={r.status} />
                </td>
                <td className="px-4 py-3 text-muted">{r.executedBy}</td>
              </tr>
            ))}
            {report.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No executions recorded in {month}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
