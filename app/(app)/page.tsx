import Link from "next/link";
import { prisma } from "@/lib/db";
import { ExecutionStatusBadge } from "@/components/Badges";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [testCaseCount, activeCycles, totalCycles, recent] = await Promise.all([
    prisma.testCase.count(),
    prisma.testCycle.count({ where: { status: "active" } }),
    prisma.testCycle.count(),
    prisma.testExecution.findMany({
      where: { executedAt: { not: null } },
      orderBy: { executedAt: "desc" },
      take: 8,
      include: {
        testCase: { select: { key: true, title: true } },
        cycle: { select: { id: true, name: true } },
        executedBy: { select: { name: true } },
      },
    }),
  ]);

  const cards = [
    { label: "Test cases", value: testCaseCount, href: "/test-cases" },
    { label: "Active cycles", value: activeCycles, href: "/cycles" },
    { label: "Total cycles", value: totalCycles, href: "/cycles" },
  ];

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card hover:shadow-md">
            <div className="text-3xl font-bold text-brand">{c.value}</div>
            <div className="mt-1 text-sm text-muted">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent executions</h2>
          <Link href="/reports" className="text-sm text-brand hover:underline">
            View reports →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No executions recorded yet.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-mono text-xs text-faint">{e.testCase.key}</span>{" "}
                  {e.testCase.title}
                  <span className="text-faint">
                    {" "}
                    in{" "}
                    <Link href={`/cycles/${e.cycle.id}`} className="hover:underline">
                      {e.cycle.name}
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-faint">
                    {e.executedBy?.name} ·{" "}
                    {e.executedAt ? new Date(e.executedAt).toLocaleDateString() : ""}
                  </span>
                  <ExecutionStatusBadge value={e.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
