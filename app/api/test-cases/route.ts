import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getApiUser, json, unauthorized, badRequest } from "@/lib/apiAuth";
import { testCaseCreateSchema } from "@/lib/validation";

// GET /api/test-cases?q=&folder=&jiraKey=&status=
export async function GET(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const folder = searchParams.get("folder")?.trim();
  const jiraKey = searchParams.get("jiraKey")?.trim();
  const status = searchParams.get("status")?.trim();

  const testCases = await prisma.testCase.findMany({
    where: {
      ...(folder ? { folder } : {}),
      ...(jiraKey ? { jiraKey } : {}),
      ...(status ? { status: status as any } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { key: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { seq: "desc" },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return json({ testCases });
}

// POST /api/test-cases
export async function POST(req: Request) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = testCaseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  // Create with a temporary unique key, then derive the human key from the
  // DB-assigned auto-increment `seq` (race-free, no manual counter).
  const created = await prisma.testCase.create({
    data: {
      key: `tmp-${randomUUID()}`,
      title: parsed.data.title,
      description: parsed.data.description,
      preconditions: parsed.data.preconditions,
      steps: parsed.data.steps,
      priority: parsed.data.priority,
      status: parsed.data.status,
      folder: parsed.data.folder,
      jiraKey: parsed.data.jiraKey,
      createdById: user.id,
    },
  });

  const testCase = await prisma.testCase.update({
    where: { id: created.id },
    data: { key: `TC-${created.seq}` },
  });

  return json({ testCase }, 201);
}
