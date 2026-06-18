import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { json, unauthorized } from "@/lib/apiAuth";

// POST /api/settings/token -> generate (or regenerate) the current user's API token.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const token = `qatms_${randomBytes(24).toString("hex")}`;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { apiToken: token },
  });

  return json({ apiToken: token });
}

// DELETE /api/settings/token -> revoke the current user's API token.
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  await prisma.user.update({
    where: { id: session.user.id },
    data: { apiToken: null },
  });

  return json({ ok: true });
}
