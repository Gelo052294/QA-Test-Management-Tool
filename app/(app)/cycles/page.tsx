import Link from "next/link";
import { prisma } from "@/lib/db";
import EmptyProject from "@/components/EmptyProject";
import FolderTree from "@/components/FolderTree";
import CycleCard from "@/components/CycleCard";
import { getCurrentProject } from "@/lib/project";
import { listFolders } from "@/lib/folders";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>;
}) {
  const user = await requireUser();
  const project = await getCurrentProject();
  if (!project) return <EmptyProject isAdmin={user.role === "admin"} />;

  const { folderId } = await searchParams;
  const [folders, cycles] = await Promise.all([
    listFolders(project.id, "cycle"),
    prisma.testCycle.findMany({
      where: { projectId: project.id, ...(folderId ? { folderId } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        executions: { select: { status: true } },
      },
    }),
  ]);

  const newHref = folderId ? `/cycles/new?folderId=${folderId}` : "/cycles/new";

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Test Cycles <span className="text-sm font-normal text-muted">· {project.key}</span>
        </h1>
        <Link href={newHref} className="btn-primary">
          + New cycle
        </Link>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <FolderTree
          folders={folders}
          projectId={project.id}
          kind="cycle"
          basePath="/cycles"
          selectedId={folderId ?? null}
          itemPatchBase="/api/cycles"
        />

        <div className="min-w-0 flex-1">
          {cycles.length > 0 && (
            <p className="mb-3 text-xs text-faint">
              Tip: drag a cycle onto a folder on the left to move it.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cycles.map((c) => {
              const total = c.executions.length;
              const passed = c.executions.filter((e) => e.status === "pass").length;
              const executed = c.executions.filter((e) => e.status !== "not_run").length;
              const pct = total ? Math.round((executed / total) * 100) : 0;
              return (
                <CycleCard
                  key={c.id}
                  id={c.id}
                  cycleKey={c.key}
                  name={c.name}
                  status={c.status}
                  total={total}
                  passed={passed}
                  pct={pct}
                />
              );
            })}
            {cycles.length === 0 && (
              <p className="text-muted">
                No cycles here.{" "}
                <Link href={newHref} className="text-brand hover:underline">
                  Create one
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
