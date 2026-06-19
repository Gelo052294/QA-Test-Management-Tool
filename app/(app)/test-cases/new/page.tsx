import Link from "next/link";
import TestCaseForm from "@/components/TestCaseForm";
import EmptyProject from "@/components/EmptyProject";
import { getCurrentProject } from "@/lib/project";
import { listFolders, buildTree, flattenForSelect } from "@/lib/folders";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewTestCasePage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject();
  const { folderId } = await searchParams;

  if (!project) return <EmptyProject isAdmin={user.role === "admin"} />;

  const folders = flattenForSelect(buildTree(await listFolders(project.id, "testcase")));

  return (
    <div>
      <div className="mb-5">
        <Link href="/test-cases" className="text-sm text-muted hover:underline">
          ← Back to test cases
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          New Test Case <span className="ml-2 text-sm font-normal text-muted">in {project.key}</span>
        </h1>
      </div>
      <div className="card">
        <TestCaseForm projectId={project.id} folders={folders} defaultFolderId={folderId} />
      </div>
    </div>
  );
}
