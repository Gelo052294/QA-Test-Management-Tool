import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import CycleForm, { CycleFormValues } from "@/components/CycleForm";

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

  const initial: CycleFormValues = {
    id: cycle.id,
    name: cycle.name,
    description: cycle.description ?? "",
    status: cycle.status,
    startDate: toDateInput(cycle.startDate),
    endDate: toDateInput(cycle.endDate),
  };

  return (
    <div>
      <div className="mb-5">
        <Link href={`/cycles/${cycle.id}`} className="text-sm text-gray-500 hover:underline">
          ← Back to cycle
        </Link>
        <h1 className="mt-1 text-xl font-bold">Edit cycle</h1>
      </div>
      <div className="card max-w-2xl">
        <CycleForm initial={initial} />
      </div>
    </div>
  );
}
