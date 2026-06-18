"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = { step: string; expectedResult: string };

export type TestCaseFormValues = {
  id?: string;
  title: string;
  description: string;
  preconditions: string;
  steps: Step[];
  priority: string;
  status: string;
  folder: string;
  jiraKey: string;
};

const empty: TestCaseFormValues = {
  title: "",
  description: "",
  preconditions: "",
  steps: [{ step: "", expectedResult: "" }],
  priority: "medium",
  status: "active",
  folder: "",
  jiraKey: "",
};

export default function TestCaseForm({
  initial,
}: {
  initial?: TestCaseFormValues;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [values, setValues] = useState<TestCaseFormValues>(initial ?? empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof TestCaseFormValues>(
    key: K,
    val: TestCaseFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function setStep(idx: number, key: keyof Step, val: string) {
    setValues((v) => {
      const steps = [...v.steps];
      steps[idx] = { ...steps[idx], [key]: val };
      return { ...v, steps };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      ...values,
      steps: values.steps.filter((s) => s.step.trim() !== ""),
      jiraKey: values.jiraKey.trim() || undefined,
      folder: values.folder.trim() || undefined,
    };

    const res = await fetch(
      isEdit ? `/api/test-cases/${initial!.id}` : "/api/test-cases",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to save.");
      return;
    }
    const data = await res.json();
    router.push(`/test-cases/${data.testCase.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label">Title *</label>
        <input
          className="input"
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div>
          <label className="label">Priority</label>
          <select
            className="input"
            value={values.priority}
            onChange={(e) => set("priority", e.target.value)}
          >
            {["low", "medium", "high", "critical"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={values.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {["draft", "active", "deprecated"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Folder</label>
          <input
            className="input"
            value={values.folder}
            placeholder="e.g. Authentication"
            onChange={(e) => set("folder", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Jira key</label>
          <input
            className="input"
            value={values.jiraKey}
            placeholder="PROJ-123"
            onChange={(e) => set("jiraKey", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input"
          rows={2}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div>
        <label className="label">Preconditions</label>
        <textarea
          className="input"
          rows={2}
          value={values.preconditions}
          onChange={(e) => set("preconditions", e.target.value)}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="label mb-0">Steps</label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              set("steps", [...values.steps, { step: "", expectedResult: "" }])
            }
          >
            + Add step
          </button>
        </div>
        <div className="space-y-2">
          {values.steps.map((s, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[2rem,1fr,1fr,2rem] sm:items-start">
              <div className="pt-2 text-sm text-muted">{i + 1}.</div>
              <textarea
                className="input"
                rows={2}
                placeholder="Action"
                value={s.step}
                onChange={(e) => setStep(i, "step", e.target.value)}
              />
              <textarea
                className="input"
                rows={2}
                placeholder="Expected result"
                value={s.expectedResult}
                onChange={(e) => setStep(i, "expectedResult", e.target.value)}
              />
              <button
                type="button"
                className="pt-2 text-sm text-red-500 hover:text-red-700"
                onClick={() =>
                  set(
                    "steps",
                    values.steps.filter((_, idx) => idx !== i)
                  )
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create test case"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
