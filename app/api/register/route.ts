import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { json, badRequest } from "@/lib/apiAuth";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Invalid input", parsed.error.flatten().fieldErrors);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return badRequest("Email is already registered");
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: "tester",
    },
  });

  return json({ id: user.id, email: user.email, name: user.name }, 201);
}
