import { del } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { getApiUser, json, unauthorized, notFound } from "@/lib/apiAuth";

type Params = { params: Promise<{ id: string }> };

// DELETE /api/evidence/:id
export async function DELETE(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const evidence = await prisma.evidence.findUnique({ where: { id } });
  if (!evidence) return notFound("Evidence not found");

  // Best-effort removal from blob storage.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await del(evidence.url);
    } catch {
      // ignore blob deletion failures; still remove the DB record
    }
  }

  await prisma.evidence.delete({ where: { id } });
  return json({ ok: true });
}
