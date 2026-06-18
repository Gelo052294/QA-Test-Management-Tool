import Link from "next/link";
import { requireUser } from "@/lib/session";
import NavLink from "@/components/NavLink";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-brand">
              QA TMS
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/" label="Dashboard" />
              <NavLink href="/test-cases" label="Test Cases" />
              <NavLink href="/cycles" label="Test Cycles" />
              <NavLink href="/reports" label="Reports" />
              <NavLink href="/settings" label="Settings" />
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.name}
              <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                {user.role}
              </span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
