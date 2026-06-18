import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CyclesPage() {
  const cycles = await prisma.testCycle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      executions: { select: { status: true } },
    },
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Test Cycles</h1>
        <Link href="/cycles/new" className="btn-primary">
          + New cycle
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cycles.map((c) => {
          const total = c.executions.length;
          const passed = c.executions.filter((e) => e.status === "pass").length;
          const executed = c.executions.filter((e) => e.status !== "not_run").length;
          const pct = total ? Math.round((executed / total) * 100) : 0;
          return (
            <Link key={c.id} href={`/cycles/${c.id}`} className="card hover:shadow-md">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">{c.name}</h2>
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    c.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                      : "bg-subtle text-muted"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <p className="mb-3 text-sm text-muted">
                {total} test{total === 1 ? "" : "s"} · {passed} passed
              </p>
              <div className="h-2 w-full rounded-full bg-subtle">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-faint">{pct}% executed</p>
            </Link>
          );
        })}
        {cycles.length === 0 && (
          <p className="text-muted">
            No cycles yet.{" "}
            <Link href="/cycles/new" className="text-brand hover:underline">
              Create one
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
