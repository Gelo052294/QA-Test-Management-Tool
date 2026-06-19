import { prisma } from "@/lib/db";

export type FolderNode = {
  id: string;
  name: string;
  parentId: string | null;
  children: FolderNode[];
  count: number;
};

type FlatFolder = { id: string; name: string; parentId: string | null; count: number };

/** Fetch folders for a project+kind with item counts, as a flat list. */
export async function listFolders(
  projectId: string,
  kind: "testcase" | "cycle"
): Promise<FlatFolder[]> {
  const folders = await prisma.folder.findMany({
    where: { projectId, kind },
    orderBy: { name: "asc" },
    include: { _count: { select: { testCases: true, cycles: true } } },
  });
  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    count: kind === "testcase" ? f._count.testCases : f._count.cycles,
  }));
}

/** Build a nested tree from a flat folder list. */
export function buildTree(flat: FlatFolder[]): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  flat.forEach((f) => byId.set(f.id, { ...f, children: [] }));
  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

/** Flatten a tree into indented options for a <select>. */
export function flattenForSelect(
  nodes: FolderNode[],
  depth = 0
): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    out.push({ id: n.id, label: `${"  ".repeat(depth)}${n.name}` });
    out.push(...flattenForSelect(n.children, depth + 1));
  }
  return out;
}
