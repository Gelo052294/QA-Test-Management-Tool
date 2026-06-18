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
      executions: {
        include: { cycle: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tc) notFound();

  const steps = (tc.steps as unknown as Step[]) ?? [];

  return (
    <div>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <Link href="/test-cases" className="text-sm text-gray-500 hover:underline">
            ← Back to test cases
          </Link>
          <h1 className="mt-1 text-xl font-bold">
            <span className="font-mono text-gray-400">{tc.key}</span> {tc.title}
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
                  <dt className="text-gray-500">Description</dt>
                  <dd className="whitespace-pre-wrap">{tc.description}</dd>
                </div>
              )}
              {tc.preconditions && (
                <div>
                  <dt className="text-gray-500">Preconditions</dt>
                  <dd className="whitespace-pre-wrap">{tc.preconditions}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold">Steps</h2>
            {steps.length === 0 ? (
              <p className="text-sm text-gray-500">No steps defined.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="w-8 py-2">#</th>
                    <th className="py-2">Action</th>
                    <th className="py-2">Expected result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {steps.map((s, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-4 whitespace-pre-wrap">{s.step}</td>
                      <td className="py-2 whitespace-pre-wrap">{s.expectedResult}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold">In test cycles</h2>
            {tc.executions.length === 0 ? (
              <p className="text-sm text-gray-500">Not part of any cycle yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {tc.executions.map((ex) => (
                  <li key={ex.id} className="flex items-center justify-between">
                    <Link href={`/cycles/${ex.cycle.id}`} className="text-brand hover:underline">
                      {ex.cycle.name}
                    </Link>
                    <ExecutionStatusBadge value={ex.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <h2 className="mb-3 font-semibold">Properties</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Priority</dt>
                <dd>
                  <PriorityBadge value={tc.priority} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd>
                  <TestCaseStatusBadge value={tc.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Folder</dt>
                <dd>{tc.folder || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Jira</dt>
                <dd>
                  <JiraLink jiraKey={tc.jiraKey} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created by</dt>
                <dd>{tc.createdBy.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Created</dt>
                <dd>{tc.createdAt.toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
