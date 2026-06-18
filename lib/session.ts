import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * For server components / pages: ensure a user is logged in,
 * otherwise redirect to the login screen.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}
