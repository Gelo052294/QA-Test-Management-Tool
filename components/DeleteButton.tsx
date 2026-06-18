"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  url,
  redirectTo,
  label = "Delete",
  confirmText = "Are you sure you want to delete this? This cannot be undone.",
}: {
  url: string;
  redirectTo?: string;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Failed to delete.");
      return;
    }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }

  return (
    <button onClick={onClick} className="btn-danger" disabled={busy}>
      {busy ? "Deleting..." : label}
    </button>
  );
}
