import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import ProjectForm from "@/components/ProjectForm";
import DeleteButton from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { testCases: true, cycles: true } },
    },
  });

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold">Projects</h1>

      <div className="card mb-6">
        <h2 className="mb-3 font-semibold">New project</h2>
        <ProjectForm />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b bg-subtle text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Test cases</th>
              <th className="px-4 py-3">Cycles</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-mono text-xs">{p.key}</td>
                <td className="px-4 py-3">
                  {p.name}
                  {p.description && (
                    <div className="text-xs text-muted">{p.description}</div>
                  )}
                </td>
                <td className="px-4 py-3">{p._count.testCases}</td>
                <td className="px-4 py-3">{p._count.cycles}</td>
                <td className="px-4 py-3 text-muted">{p.createdBy.name}</td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton
                    url={`/api/projects/${p.id}`}
                    label="Delete"
                    confirmText={`Delete project ${p.key} and ALL its test cases & cycles? This cannot be undone.`}
                  />
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No projects yet. Create your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
