import Link from "next/link";
import { prisma } from "@/lib/db";
import EmptyProject from "@/components/EmptyProject";
import { getCurrentProject } from "@/lib/project";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireUser();
  const project = await getCurrentProject();
  if (!project) return <EmptyProject isAdmin={user.role === "admin"} />;

  const cycles = await prisma.testCycle.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, status: true, key: true },
  });

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold">
        Reports <span className="text-sm font-normal text-muted">· {project.key}</span>
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href={`/reports/monthly?month=${month}`} className="card hover:shadow-md">
          <h2 className="font-semibold">📅 Monthly execution</h2>
          <p className="mt-1 text-sm text-muted">
            Tests executed this month, by whom, with pass rate.
          </p>
        </Link>
        <Link href="/reports/testers" className="card hover:shadow-md">
          <h2 className="font-semibold">👤 Per-tester activity</h2>
          <p className="mt-1 text-sm text-muted">
            Test cases created and executions run per user.
          </p>
        </Link>
        <Link href="/reports/jira-coverage" className="card hover:shadow-md">
          <h2 className="font-semibold">🔗 Jira coverage</h2>
          <p className="mt-1 text-sm text-muted">
            Which Jira tickets have linked test cases and their latest result.
          </p>
        </Link>
      </div>

      <div className="card mt-6">
        <h2 className="mb-3 font-semibold">📊 Test cycle summary</h2>
        {cycles.length === 0 ? (
          <p className="text-sm text-muted">No cycles yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {cycles.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>
                  {c.key && <span className="mr-1 font-mono text-xs text-faint">{c.key}</span>}
                  {c.name}
                </span>
                <Link
                  href={`/reports/cycle/${c.id}`}
                  className="text-sm text-brand hover:underline"
                >
                  View report →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
