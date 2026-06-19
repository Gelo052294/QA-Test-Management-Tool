import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PriorityBadge, TestCaseStatusBadge, ExecutionStatusBadge } from "@/components/Badges";
import JiraLink from "@/components/JiraLink";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

type Step = { step: string; expectedResult: string };

export default async function TestCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tc = await prisma.testCase.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      folderRef: { select: { name: true } },
      executions: {
        include: {
          cycle: { select: { id: true, name: true, key: true } },
          executedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      history: {
        include: { changedBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      },
    },
  });

  if (!tc) notFound();

  const steps = (tc.steps as unknown as Step[]) ?? [];

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <Link href="/test-cases" className="text-sm text-muted hover:underline">
            ← Back to test cases
          </Link>
          <h1 className="mt-1 text-xl font-bold">
            <span className="font-mono text-faint">{tc.key}</span> {tc.title}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/test-cases/${tc.id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <DeleteButton
            url={`/api/test-cases/${tc.id}`}
            redirectTo="/test-cases"
            confirmText="Delete this test case and all its executions?"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="card">
            <h2 className="mb-3 font-semibold">Details</h2>
            <dl className="space-y-2 text-sm">
              {tc.description && (
                <div>
                  <dt className="text-muted">Description</dt>
                  <dd className="whitespace-pre-wrap">{tc.description}</dd>
                </div>
              )}
              {tc.preconditions && (
                <div>
                  <dt className="text-muted">Preconditions</dt>
                  <dd className="whitespace-pre-wrap">{tc.preconditions}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold">Steps</h2>
            {steps.length === 0 ? (
              <p className="text-sm text-muted">No steps defined.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="w-8 py-2">#</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Expected result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {steps.map((s, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-2 text-faint">{i + 1}</td>
                      <td className="py-2 pr-4 whitespace-pre-wrap">{s.step}</td>
                      <td className="py-2 whitespace-pre-wrap">{s.expectedResult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card overflow-x-auto">
            <h2 className="mb-3 font-semibold">Execution history</h2>
            {tc.executions.length === 0 ? (
              <p className="text-sm text-muted">Not part of any cycle yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-line text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-4">Test Cycle</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Executed at</th>
                    <th className="py-2 pr-4">Executed by</th>
                    <th className="py-2">Defect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tc.executions.map((ex) => (
                    <tr key={ex.id} className="align-top">
                      <td className="py-2 pr-4">
                        <Link href={`/cycles/${ex.cycle.id}`} className="text-brand hover:underline">
                          {ex.cycle.key ? <span className="font-mono text-xs">{ex.cycle.key} </span> : null}
                          {ex.cycle.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">
                        <ExecutionStatusBadge value={ex.status} />
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap text-muted">
                        {ex.executedAt ? new Date(ex.executedAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 pr-4">{ex.executedBy?.name ?? "—"}</td>
                      <td className="py-2">
                        <JiraLink jiraKey={ex.defectJiraKey} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <details className="card">
            <summary className="cursor-pointer font-semibold">
              Change history ({tc.history.length})
            </summary>
            <div className="mt-3 overflow-x-auto">
              {tc.history.length === 0 ? (
                <p className="text-sm text-muted">No changes recorded yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-line text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="py-2 pr-4">Changed By</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Field</th>
                      <th className="py-2 pr-4">Original Value</th>
                      <th className="py-2">New Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {tc.history.map((h) => (
                      <tr key={h.id} className="align-top">
                        <td className="py-2 pr-4 whitespace-nowrap">{h.changedBy.name}</td>
                        <td className="py-2 pr-4 whitespace-nowrap text-muted">
                          {h.createdAt.toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">{h.field}</td>
                        <td className="py-2 pr-4 break-words text-muted">{h.oldValue ?? "-"}</td>
                        <td className="py-2 break-words">{h.newValue ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </details>
        </div>

        <div className="space-y-5">
          <div className="card">
            <h2 className="mb-3 font-semibold">Properties</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Priority</dt>
                <dd>
                  <PriorityBadge value={tc.priority} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Status</dt>
                <dd>
                  <TestCaseStatusBadge value={tc.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Folder</dt>
                <dd>{tc.folderRef?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Jira</dt>
                <dd>
                  <JiraLink jiraKey={tc.jiraKey} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Created by</dt>
                <dd>{tc.createdBy.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Created</dt>
                <dd>{tc.createdAt.toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
