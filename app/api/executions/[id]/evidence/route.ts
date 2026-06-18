import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";

type Params = { params: Promise<{ id: string }> };

// POST /api/executions/:id/evidence  (multipart/form-data, field "file")
export async function POST(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const execution = await prisma.testExecution.findUnique({ where: { id } });
  if (!execution) return notFound("Execution not found");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return badRequest(
      "Evidence upload is not configured. Set BLOB_READ_WRITE_TOKEN (Vercel Blob)."
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return badRequest("Expected a 'file' field in multipart/form-data");
  }

  // Store under a per-execution path to keep things tidy.
  const blob = await put(`evidence/${id}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const evidence = await prisma.evidence.create({
    data: {
      executionId: id,
      fileName: file.name,
      url: blob.url,
      contentType: file.type || null,
      uploadedById: user.id,
    },
  });

  return json({ evidence }, 201);
}

// GET /api/executions/:id/evidence -> list evidence for an execution
export async function GET(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const evidence = await prisma.evidence.findMany({
    where: { executionId: id },
    orderBy: { uploadedAt: "desc" },
    include: { uploadedBy: { select: { name: true } } },
  });
  return json({ evidence });
}
