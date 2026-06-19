import Link from "next/link";
import { prisma } from "@/lib/db";
import EmptyProject from "@/components/EmptyProject";
import FolderTree from "@/components/FolderTree";
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
        />

        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cycles.map((c) => {
              const total = c.executions.length;
              const passed = c.executions.filter((e) => e.status === "pass").length;
              const executed = c.executions.filter((e) => e.status !== "not_run").length;
              const pct = total ? Math.round((executed / total) * 100) : 0;
              return (
                <Link key={c.id} href={`/cycles/${c.id}`} className="card hover:shadow-md">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-semibold">
                      {c.key && <span className="mr-1 font-mono text-xs text-faint">{c.key}</span>}
                      {c.name}
                    </h2>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        c.status === "active"
                          ? "bg-[#dcefe3] text-[#357d52] dark:bg-[#1d3328] dark:text-[#82d6a0]"
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
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-faint">{pct}% executed</p>
                </Link>
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
