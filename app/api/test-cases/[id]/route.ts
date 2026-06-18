import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { testCaseUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const testCase = await prisma.testCase.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      executions: {
        include: { cycle: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!testCase) return notFound("Test case not found");
  return json({ testCase });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = testCaseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.testCase.findUnique({ where: { id } });
  if (!existing) return notFound("Test case not found");

  const testCase = await prisma.testCase.update({
    where: { id },
    data: parsed.data,
  });
  return json({ testCase });
}

export async function DELETE(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const existing = await prisma.testCase.findUnique({ where: { id } });
  if (!existing) return notFound("Test case not found");

  await prisma.testCase.delete({ where: { id } });
  return json({ ok: true });
}
