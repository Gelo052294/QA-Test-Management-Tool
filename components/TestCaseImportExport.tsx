"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TestCaseImportExport({ projectId }: { projectId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    const form = new FormData();
    form.append("file", file);
    form.append("projectId", projectId);
    const res = await fetch("/api/test-cases/import", { method: "POST", body: form });
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error || "Import failed");
      return;
    }
    setMsg(`Imported ${data.imported} test case${data.imported === 1 ? "" : "s"}.`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <a href="/api/test-cases/template" className="text-sm text-brand hover:underline">
        Template
      </a>
      <a
        href={`/api/test-cases/export?projectId=${encodeURIComponent(projectId)}`}
        className="btn-secondary"
      >
        Export Excel
      </a>
      <label className="btn-secondary cursor-pointer" title="Import test cases from an .xlsx file (Title column required)">
        {busy ? "Importing..." : "Import Excel"}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={onImport}
          disabled={busy}
        />
      </label>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
