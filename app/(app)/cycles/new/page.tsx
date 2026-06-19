import Link from "next/link";
import CycleForm from "@/components/CycleForm";
import EmptyProject from "@/components/EmptyProject";
import { getCurrentProject } from "@/lib/project";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewCyclePage() {
  const user = await requireUser();
  const project = await getCurrentProject();

  return (
    <div>
      <div className="mb-5">
        <Link href="/cycles" className="text-sm text-muted hover:underline">
          ← Back to cycles
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          New Test Cycle
          {project && <span className="ml-2 text-sm font-normal text-muted">in {project.key}</span>}
        </h1>
      </div>
      {project ? (
        <div className="card max-w-2xl">
          <CycleForm projectId={project.id} />
        </div>
      ) : (
        <EmptyProject isAdmin={user.role === "admin"} />
      )}
    </div>
  );
}
