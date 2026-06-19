import Link from "next/link";
import { requireUser } from "@/lib/session";
import { listProjects, getCurrentProject } from "@/lib/project";
import NavLink from "@/components/NavLink";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import ProjectSwitcher from "@/components/ProjectSwitcher";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [projects, current] = await Promise.all([listProjects(), getCurrentProject()]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface no-print">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-5">
            <Link href="/" className="text-lg font-bold text-brand">
              QA TMS
            </Link>
            <ProjectSwitcher
              projects={projects.map((p) => ({ id: p.id, key: p.key, name: p.name }))}
              currentId={current?.id ?? null}
            />
            <nav className="flex items-center gap-1">
              <NavLink href="/" label="Dashboard" />
              <NavLink href="/test-cases" label="Test Cases" />
              <NavLink href="/cycles" label="Test Cycles" />
              <NavLink href="/reports" label="Reports" />
              {user.role === "admin" && <NavLink href="/projects" label="Projects" />}
              <NavLink href="/settings" label="Settings" />
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-muted">
              {user.name}
              <span className="ml-1 rounded bg-subtle px-1.5 py-0.5 text-xs text-muted">
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
