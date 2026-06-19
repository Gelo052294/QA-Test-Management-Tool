"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Flat = { id: string; name: string; parentId: string | null };
type Node = Flat & { children: Node[] };

function buildTree(flat: Flat[]): Node[] {
  const byId = new Map<string, Node>();
  flat.forEach((f) => byId.set(f.id, { ...f, children: [] }));
  const roots: Node[] = [];
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId)!.children.push(n);
    else roots.push(n);
  }
  const sort = (ns: Node[]) => {
    ns.sort((a, b) => a.name.localeCompare(b.name));
    ns.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export default function FolderTree({
  folders,
  projectId,
  kind,
  basePath,
  selectedId,
}: {
  folders: Flat[];
  projectId: string;
  kind: "testcase" | "cycle";
  basePath: string;
  selectedId: string | null;
}) {
  const router = useRouter();
  const tree = buildTree(folders);
  const [busy, setBusy] = useState(false);

  async function addFolder(parentId: string | null) {
    const name = window.prompt(parentId ? "New subfolder name:" : "New folder name:");
    if (!name || !name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, kind, name: name.trim(), parentId: parentId ?? undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Could not create the folder.");
      return;
    }
    router.refresh();
  }

  async function rename(id: string, current: string) {
    const name = window.prompt("Rename folder:", current);
    if (!name || !name.trim() || name.trim() === current) return;
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this folder and its subfolders? Items inside become unfiled.")) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (selectedId === id) router.push(basePath);
    else router.refresh();
  }

  function go(id: string | null) {
    router.push(id ? `${basePath}?folderId=${id}` : basePath);
  }

  function renderNodes(nodes: Node[], depth: number) {
    return nodes.map((n) => (
      <li key={n.id}>
        <div
          className={`group flex items-center gap-1 rounded px-2 py-1 text-sm ${
            selectedId === n.id ? "bg-brand/10 text-brand" : "text-ink hover:bg-subtle"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <button onClick={() => go(n.id)} className="flex-1 truncate text-left" title={n.name}>
            📁 {n.name}
          </button>
          <span className="hidden gap-1 group-hover:flex">
            <button onClick={() => addFolder(n.id)} title="Add subfolder" className="text-faint hover:text-ink">＋</button>
            <button onClick={() => rename(n.id, n.name)} title="Rename" className="text-faint hover:text-ink">✎</button>
            <button onClick={() => remove(n.id)} title="Delete" className="text-faint hover:text-neg">✕</button>
          </span>
        </div>
        {n.children.length > 0 && <ul>{renderNodes(n.children, depth + 1)}</ul>}
      </li>
    ));
  }

  return (
    <aside className="w-full shrink-0 sm:w-56">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Folders</span>
        <button onClick={() => addFolder(null)} disabled={busy} className="text-sm text-brand hover:underline">
          + New
        </button>
      </div>
      <ul className="rounded-md border border-line bg-surface p-1">
        <li>
          <button
            onClick={() => go(null)}
            className={`w-full rounded px-2 py-1 text-left text-sm ${
              selectedId === null ? "bg-brand/10 text-brand" : "text-ink hover:bg-subtle"
            }`}
          >
            All
          </button>
        </li>
        {renderNodes(tree, 0)}
        {tree.length === 0 && (
          <li className="px-2 py-1 text-xs text-faint">No folders yet — “+ New”.</li>
        )}
      </ul>
    </aside>
  );
}
