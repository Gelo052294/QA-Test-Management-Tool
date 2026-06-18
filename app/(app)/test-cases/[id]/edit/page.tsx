import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import TestCaseForm, { TestCaseFormValues } from "@/components/TestCaseForm";

export const dynamic = "force-dynamic";

type Step = { step: string; expectedResult: string };

export default async function EditTestCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tc = await prisma.testCase.findUnique({ where: { id } });
  if (!tc) notFound();

  const initial: TestCaseFormValues = {
    id: tc.id,
    title: tc.title,
    description: tc.description ?? "",
    preconditions: tc.preconditions ?? "",
    steps:
      ((tc.steps as unknown as Step[]) ?? []).length > 0
        ? (tc.steps as unknown as Step[])
        : [{ step: "", expectedResult: "" }],
    priority: tc.priority,
    status: tc.status,
    folder: tc.folder ?? "",
    jiraKey: tc.jiraKey ?? "",
  };

  return (
    <div>
      <div className="mb-5">
        <Link href={`/test-cases/${tc.id}`} className="text-sm text-muted hover:underline">
          ← Back to test case
        </Link>
        <h1 className="mt-1 text-xl font-bold">
          Edit <span className="font-mono text-faint">{tc.key}</span>
        </h1>
      </div>
      <div className="card">
        <TestCaseForm initial={initial} />
      </div>
    </div>
  );
}
