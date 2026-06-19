import { NextResponse } from "next/server";
import { User } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Resolve the current user for an API route.
 * Accepts either a logged-in session cookie (UI) or an
 * `Authorization: Bearer <apiToken>` header (programmatic clients).
 */
export async function getApiUser(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) {
      const user = await prisma.user.findUnique({ where: { apiToken: token } });
      if (user) return user;
    }
  }

  const session = await auth();
  if (session?.user?.id) {
    return prisma.user.findUnique({ where: { id: session.user.id } });
  }

  return null;
}

/** Standard JSON helpers so routes stay terse. */
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Admins only") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
