"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TC = { id: string; key: string; title: string; folder: string | null };

export default function AddTestCases({
  cycleId,
  projectId,
  existingIds,
}: {
  cycleId: string;
  projectId: string;
  existingIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<TC[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/test-cases?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((d) => setAll(d.testCases ?? []))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const existing = new Set(existingIds);
  const available = all
    .filter((tc) => !existing.has(tc.id))
    .filter((tc) =>
      q.trim()
        ? (tc.title + tc.key + (tc.folder ?? "")).toLowerCase().includes(q.toLowerCase())
        : true
    );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function add() {
    if (selected.size === 0) return;
    setSaving(true);
    const res = await fetch(`/api/cycles/${cycleId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testCaseIds: Array.from(selected) }),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setSelected(new Set());
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        + Add test cases
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Add test cases to cycle</h3>
          <button onClick={() => setOpen(false)} className="text-faint hover:text-ink">
            ✕
          </button>
        </div>
        <div className="border-b p-4">
          <input
            className="input"
            placeholder="Filter..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-muted">No more test cases to add.</p>
          ) : (
            <ul className="space-y-1">
              {available.map((tc) => (
                <li key={tc.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-subtle">
                    <input
                      type="checkbox"
                      checked={selected.has(tc.id)}
                      onChange={() => toggle(tc.id)}
                    />
                    <span className="font-mono text-xs text-faint">{tc.key}</span>
                    <span className="text-sm">{tc.title}</span>
                    {tc.folder && (
                      <span className="ml-auto text-xs text-faint">{tc.folder}</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 border-t p-4">
          <span className="mr-auto text-sm text-muted">{selected.size} selected</span>
          <button className="btn-secondary" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button className="btn-primary" onClick={add} disabled={saving || selected.size === 0}>
            {saving ? "Adding..." : "Add selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
