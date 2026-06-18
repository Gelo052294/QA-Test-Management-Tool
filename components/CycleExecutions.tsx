"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExecutionStatusBadge } from "@/components/Badges";

type Evidence = { id: string; fileName: string; url: string };
type ExecRow = {
  id: string;
  status: string;
  comment: string | null;
  defectJiraKey: string | null;
  executedByName: string | null;
  executedAt: string | null;
  testCase: { id: string; key: string; title: string; priority: string };
  evidence: Evidence[];
};

const STATUSES = ["not_run", "pass", "fail", "blocked"];

export default function CycleExecutions({
  executions,
}: {
  executions: ExecRow[];
}) {
  if (executions.length === 0) {
    return (
      <p className="text-sm text-muted">
        No test cases in this cycle yet. Use “Add test cases” above.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {executions.map((ex) => (
        <Row key={ex.id} ex={ex} />
      ))}
    </div>
  );
}

function Row({ ex }: { ex: ExecRow }) {
  const router = useRouter();
  const [status, setStatus] = useState(ex.status);
  const [comment, setComment] = useState(ex.comment ?? "");
  const [defect, setDefect] = useState(ex.defectJiraKey ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/executions/${ex.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        comment: comment || undefined,
        defectJiraKey: defect.trim() || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "Save failed");
      return;
    }
    setMsg("Saved");
    router.refresh();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/executions/${ex.id}/evidence`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg(data.error || "Upload failed");
      return;
    }
    router.refresh();
  }

  async function removeEvidence(id: string) {
    if (!confirm("Remove this evidence file?")) return;
    const res = await fetch(`/api/evidence/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href={`/test-cases/${ex.testCase.id}`}
            className="font-medium hover:underline"
          >
            <span className="font-mono text-xs text-faint">
              {ex.testCase.key}
            </span>{" "}
            {ex.testCase.title}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ExecutionStatusBadge value={status} />
          {ex.executedByName && (
            <span className="text-xs text-faint">
              by {ex.executedByName}
              {ex.executedAt
                ? ` · ${new Date(ex.executedAt).toLocaleString()}`
                : ""}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem,1fr,10rem]">
        <div>
          <label className="label">Result</label>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Comment</label>
          <input
            className="input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Notes about this run"
          />
        </div>
        <div>
          <label className="label">Defect (Jira)</label>
          <input
            className="input"
            value={defect}
            onChange={(e) => setDefect(e.target.value)}
            placeholder="PROJ-456"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={save} className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save result"}
        </button>
        <label className="btn-secondary cursor-pointer">
          {uploading ? "Uploading..." : "+ Evidence"}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={upload}
            disabled={uploading}
          />
        </label>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>

      {ex.evidence.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {ex.evidence.map((f) => (
            <li key={f.id} className="flex items-center gap-3">
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                📎 {f.fileName}
              </a>
              <button
                onClick={() => removeEvidence(f.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
