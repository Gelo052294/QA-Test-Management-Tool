"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MoveToFolder({
  endpoint,
  folders,
  currentFolderId,
}: {
  endpoint: string;
  folders: { id: string; label: string }[];
  currentFolderId: string | null;
}) {
  const router = useRouter();
  const [val, setVal] = useState(currentFolderId ?? "");
  const [busy, setBusy] = useState(false);

  async function change(e: React.ChangeEvent<HTMLSelectElement>) {
    const folderId = e.target.value;
    setVal(folderId);
    setBusy(true);
    await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: folderId || null }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      aria-label="Move to folder"
      value={val}
      onChange={change}
      disabled={busy}
      className="max-w-[12rem] rounded border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-brand focus:outline-none"
    >
      <option value="">— No folder —</option>
      {folders.map((f) => (
        <option key={f.id} value={f.id}>
          {f.label.trim()}
        </option>
      ))}
    </select>
  );
}
