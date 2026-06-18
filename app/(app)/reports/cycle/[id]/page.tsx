import Link from "next/link";
import { notFound } from "next/navigation";
import { cycleSummary } from "@/lib/reports";
import { ExecutionStatusBadge } from "@/components/Badges";
import JiraLink from "@/components/JiraLink";

export const dynamic = "force-dynamic";

export default async function CycleReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await cycleSummary(id);
  if (!report) notFound();

  const stats = [
    { label: "Total", value: report.total, color: "text-gray-800" },
    { label: "Passed", value: report.counts.pass, color: "text-green-600" },
    { label: "Failed", value: report.counts.fail, color: "text-red-600" },
    { label: "Blocked", value: report.counts.blocked, color: "text-yellow-600" },
    { label: "Not run", value: report.counts.not_run, color: "text-gray-500" },
    { label: "Pass rate", value: `${report.passRate}%`, color: "text-brand" },
  ];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-sm text-gray-500 hover:underline">
            ← Reports
          </Link>
          <h1 className="mt-1 text-xl font-bold">Cycle report: {report.cycle.name}</h1>
        </div>
        <a href={`/api/reports/cycle-summary?cycleId=${id}&format=csv`} className="btn-secondary">
          Export CSV
        </a>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Test Case</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Executed by</th>
              <th className="px-4 py-3">Defect</th>
              <th className="px-4 py-3">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {report.rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-400">{r.key}</span> {r.title}
                </td>
                <td className="px-4 py-3">
                  <ExecutionStatusBadge value={r.status} />
                </td>
                <td className="px-4 py-3 text-gray-600">{r.executedBy || "—"}</td>
                <td className="px-4 py-3">
                  <JiraLink jiraKey={r.defectJiraKey || null} />
                </td>
                <td className="px-4 py-3 text-gray-600">{r.comment || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
