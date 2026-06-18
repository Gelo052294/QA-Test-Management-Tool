import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import CycleExecutions from "@/components/CycleExecutions";
import AddTestCases from "@/components/AddTestCases";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function CycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cycle = await prisma.testCycle.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      executions: {
        include: {
          testCase: true,
          executedBy: { select: { name: true } },
          evidence: { select: { id: true, fileName: true, url: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!cycle) notFound();

  const total = cycle.executions.length;
  const count = (s: string) => cycle.executions.filter((e) => e.status === s).length;
  const passed = count("pass");
  const failed = count("fail");
  const blocked = count("blocked");
  const notRun = count("not_run");
  const executed = total - notRun;
  const passRate = executed ? Math.round((passed / executed) * 100) : 0;
  const progress = total ? Math.round((executed / total) * 100) : 0;

  const rows = cycle.executions.map((e) => ({
    id: e.id,
    status: e.status,
    comment: e.comment,
    defectJiraKey: e.defectJiraKey,
    executedByName: e.executedBy?.name ?? null,
    executedAt: e.executedAt ? e.executedAt.toISOString() : null,
    testCase: {
      id: e.testCase.id,
      key: e.testCase.key,
      title: e.testCase.title,
      priority: e.testCase.priority,
    },
    evidence: e.evidence,
  }));

  const stats = [
    { label: "Passed", value: passed, color: "text-green-600" },
    { label: "Failed", value: failed, color: "text-red-600" },
    { label: "Blocked", value: blocked, color: "text-yellow-600" },
    { label: "Not run", value: notRun, color: "text-gray-500" },
  ];

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <Link href="/cycles" className="text-sm text-gray-500 hover:underline">
            ← Back to cycles
          </Link>
          <h1 className="mt-1 text-xl font-bold">{cycle.name}</h1>
          {cycle.description && (
            <p className="mt-1 text-sm text-gray-500">{cycle.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/reports/cycle/${cycle.id}`} className="btn-secondary">
            View report
          </Link>
          <Link href={`/cycles/${cycle.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <DeleteButton
            url={`/api/cycles/${cycle.id}`}
            redirectTo="/cycles"
            confirmText="Delete this cycle and all its executions?"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
        <div className="card text-center">
          <div className="text-2xl font-bold text-brand">{passRate}%</div>
          <div className="text-xs text-gray-500">Pass rate</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-800">{progress}%</div>
          <div className="text-xs text-gray-500">Executed</div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Test cases ({total})</h2>
        <AddTestCases
          cycleId={cycle.id}
          existingIds={cycle.executions.map((e) => e.testCaseId)}
        />
      </div>

      <CycleExecutions executions={rows} />
    </div>
  );
}
