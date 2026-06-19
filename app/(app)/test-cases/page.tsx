import Link from "next/link";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { PriorityBadge, TestCaseStatusBadge } from "@/components/Badges";
import JiraLink from "@/components/JiraLink";
import SearchBox from "@/components/SearchBox";
import TestCaseImportExport from "@/components/TestCaseImportExport";
import FolderTree from "@/components/FolderTree";
import MoveToFolder from "@/components/MoveToFolder";
import EmptyProject from "@/components/EmptyProject";
import { getCurrentProject } from "@/lib/project";
import { listFolders, buildTree, flattenForSelect, collectFolderIds } from "@/lib/folders";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TestCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; folderId?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject();
  if (!project) return <EmptyProject isAdmin={user.role === "admin"} />;

  const { q, folderId } = await searchParams;
  const folders = await listFolders(project.id, "testcase");
  const folderIds = folderId ? collectFolderIds(folders, folderId) : null;

  const testCases = await prisma.testCase.findMany({
    where: {
      projectId: project.id,
      ...(folderIds ? { folderId: { in: folderIds } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { key: { contains: q, mode: "insensitive" } },
              { jiraKey: { contains: q, mode: "insensitive" } },
            ] as Prisma.TestCaseWhereInput["OR"],
          }
        : {}),
    },
    orderBy: { seq: "desc" },
    include: { createdBy: { select: { name: true } }, folderRef: { select: { name: true } } },
  });

  const folderOptions = flattenForSelect(buildTree(folders));
  const newHref = folderId ? `/test-cases/new?folderId=${folderId}` : "/test-cases/new";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Test Cases <span className="text-sm font-normal text-muted">· {project.key}</span>
        </h1>
        <div className="flex items-center gap-2">
          <TestCaseImportExport projectId={project.id} />
          <Link href={newHref} className="btn-primary">
            + New test case
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <FolderTree
          folders={folders}
          projectId={project.id}
          kind="testcase"
          basePath="/test-cases"
          selectedId={folderId ?? null}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-4">
            <SearchBox placeholder="Search by title, key or Jira key..." />
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-subtle text-left text-xs uppercase text-muted">
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
              <tbody className="divide-y divide-line">
                {testCases.map((tc) => (
                  <tr key={tc.id} className="hover:bg-subtle">
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
                    <td className="px-4 py-3">
                      <MoveToFolder
                        endpoint={`/api/test-cases/${tc.id}`}
                        folders={folderOptions}
                        currentFolderId={tc.folderId}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <JiraLink jiraKey={tc.jiraKey} />
                    </td>
                    <td className="px-4 py-3 text-muted">{tc.createdBy.name}</td>
                  </tr>
                ))}
                {testCases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted">
                      No test cases here.{" "}
                      <Link href={newHref} className="text-brand hover:underline">
                        Create one
                      </Link>
                      .
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
