import Link from "next/link";
import { testerActivity } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function TestersReportPage() {
  const testers = await testerActivity();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link href="/reports" className="text-sm text-gray-500 hover:underline">
            ← Reports
          </Link>
          <h1 className="mt-1 text-xl font-bold">Per-tester activity</h1>
        </div>
        <a href="/api/reports/testers?format=csv" className="btn-secondary">
          Export CSV
        </a>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Cases created</th>
              <th className="px-4 py-3">Executions</th>
              <th className="px-4 py-3">Passed</th>
              <th className="px-4 py-3">Failed</th>
              <th className="px-4 py-3">Blocked</th>
              <th className="px-4 py-3">Pass rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {testers.map((t) => (
              <tr key={t.email}>
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-gray-600">{t.email}</td>
                <td className="px-4 py-3">{t.testCasesCreated}</td>
                <td className="px-4 py-3">{t.executionsRun}</td>
                <td className="px-4 py-3 text-green-600">{t.pass}</td>
                <td className="px-4 py-3 text-red-600">{t.fail}</td>
                <td className="px-4 py-3 text-yellow-600">{t.blocked}</td>
                <td className="px-4 py-3">{t.passRate}%</td>
              </tr>
            ))}
            {testers.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
