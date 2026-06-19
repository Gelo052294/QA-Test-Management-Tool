"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DuplicateCycleButton({
  cycleId,
  currentName,
}: {
  cycleId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    // Renaming is mandatory: keep prompting until a different non-empty name is given.
    const name = window.prompt("Name for the duplicated cycle:", `${currentName} (copy)`);
    if (name === null) return; // cancelled
    const trimmed = name.trim();
    if (!trimmed) {
      alert("A name is required for the copy.");
      return;
    }
    if (trimmed === currentName.trim()) {
      alert("Please choose a different name for the copy.");
      return;
    }

    setBusy(true);
    const res = await fetch(`/api/cycles/${cycleId}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to duplicate.");
      return;
    }
    const data = await res.json();
    router.push(`/cycles/${data.cycle.id}`);
    router.refresh();
  }

  return (
    <button onClick={duplicate} className="btn-secondary" disabled={busy}>
      {busy ? "Duplicating..." : "Duplicate"}
    </button>
  );
}
