import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import CycleForm, { CycleFormValues } from "@/components/CycleForm";
import { listFolders, buildTree, flattenForSelect } from "@/lib/folders";

export const dynamic = "force-dynamic";

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export default async function EditCyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cycle = await prisma.testCycle.findUnique({ where: { id } });
  if (!cycle) notFound();

  const folders = cycle.projectId
    ? flattenForSelect(buildTree(await listFolders(cycle.projectId, "cycle")))
    : [];

  const initial: CycleFormValues = {
    id: cycle.id,
    name: cycle.name,
    description: cycle.description ?? "",
    status: cycle.status,
    startDate: toDateInput(cycle.startDate),
    endDate: toDateInput(cycle.endDate),
    folderId: cycle.folderId ?? "",
  };

  return (
    <div>
      <div className="mb-5">
        <Link href={`/cycles/${cycle.id}`} className="text-sm text-muted hover:underline">
          ← Back to cycle
        </Link>
        <h1 className="mt-1 text-xl font-bold">Edit cycle</h1>
      </div>
      <div className="card max-w-2xl">
        <CycleForm initial={initial} folders={folders} />
      </div>
    </div>
  );
}
