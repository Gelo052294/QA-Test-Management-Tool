import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { addItemsSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

// POST /api/cycles/:id/items  { testCaseIds: [...] }
// Adds test cases to a cycle as `not_run` executions (skips duplicates).
export async function POST(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const cycle = await prisma.testCycle.findUnique({ where: { id } });
  if (!cycle) return notFound("Cycle not found");

  const body = await req.json().catch(() => null);
  const parsed = addItemsSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  // Only allow test cases that belong to the same project as the cycle.
  const sameProject = await prisma.testCase.findMany({
    where: { id: { in: parsed.data.testCaseIds }, projectId: cycle.projectId },
    select: { id: true },
  });

  const result = await prisma.testExecution.createMany({
    data: sameProject.map((tc) => ({ cycleId: id, testCaseId: tc.id })),
    skipDuplicates: true,
  });

  return json({ added: result.count }, 201);
}
