"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Project = { id: string; key: string; name: string };

export default function ProjectSwitcher({
  projects,
  currentId,
}: {
  projects: Project[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (projects.length === 0) {
    return <span className="text-sm text-faint">No project</span>;
  }

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const projectId = e.target.value;
    setBusy(true);
    await fetch("/api/projects/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      aria-label="Current project"
      className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      value={currentId ?? ""}
      onChange={change}
      disabled={busy}
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.key} · {p.name}
        </option>
      ))}
    </select>
  );
}
