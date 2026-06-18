import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PriorityBadge, TestCaseStatusBadge } from "@/components/Badges";
import JiraLink from "@/components/JiraLink";
import SearchBox from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function TestCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where: Prisma.TestCaseWhereInput = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { key: { contains: q, mode: "insensitive" } },
          { folder: { contains: q, mode: "insensitive" } },
          { jiraKey: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const testCases = await prisma.testCase.findMany({
    where,
    orderBy: { seq: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">Test Cases</h1>
        <Link href="/test-cases/new" className="btn-primary">
          + New test case
        </Link>
      </div>

      <div className="mb-4">
        <SearchBox placeholder="Search by title, key, folder or Jira key..." />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Folder</th>
              <th className="px-4 py-3">Jira</th>
              <th className="px-4 py-3">Created by</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {testCases.map((tc) => (
              <tr key={tc.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                  <Link href={`/test-cases/${tc.id}`} className="text-brand hover:underline">
                    {tc.key}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/test-cases/${tc.id}`} className="hover:underline">
                    {tc.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge value={tc.priority} />
                </td>
                <td className="px-4 py-3">
                  <TestCaseStatusBadge value={tc.status} />
                </td>
                <td className="px-4 py-3 text-gray-600">{tc.folder || "—"}</td>
                <td className="px-4 py-3">
                  <JiraLink jiraKey={tc.jiraKey} />
                </td>
                <td className="px-4 py-3 text-gray-600">{tc.createdBy.name}</td>
              </tr>
            ))}
            {testCases.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  No test cases yet.{" "}
                  <Link href="/test-cases/new" className="text-brand hover:underline">
                    Create the first one
                  </Link>
                  .
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
