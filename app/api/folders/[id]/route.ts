import { prisma } from "@/lib/db";
import {
  getApiUser,
  json,
  unauthorized,
  badRequest,
  notFound,
} from "@/lib/apiAuth";
import { folderUpdateSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = folderUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.folder.findUnique({ where: { id } });
  if (!existing) return notFound("Folder not found");

  const data: { name?: string; hidden?: boolean } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.hidden !== undefined) data.hidden = parsed.data.hidden;

  const folder = await prisma.folder.update({ where: { id }, data });
  return json({ folder });
}

// DELETE: removes the folder and its subfolders (cascade). Items inside are
// kept but become unfiled (folderId set to null via SetNull).
export async function DELETE(req: Request, { params }: Params) {
  const user = await getApiUser(req);
  if (!user) return unauthorized();
  const { id } = await params;

  const existing = await prisma.folder.findUnique({ where: { id } });
  if (!existing) return notFound("Folder not found");

  await prisma.folder.delete({ where: { id } });
  return json({ ok: true });
}
