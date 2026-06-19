"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type CycleFormValues = {
  id?: string;
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
};

const empty: CycleFormValues = {
  name: "",
  description: "",
  status: "active",
  startDate: "",
  endDate: "",
};

export default function CycleForm({ initial }: { initial?: CycleFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [values, setValues] = useState<CycleFormValues>(initial ?? empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof CycleFormValues>(key: K, val: CycleFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const payload = {
      name: values.name,
      description: values.description || undefined,
      status: values.status,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
    };

    const res = await fetch(
      isEdit ? `/api/cycles/${initial!.id}` : "/api/cycles",
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
    router.push(`/cycles/${data.cycle.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className="label">Name *</label>
        <input
          className="input"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Status</label>
          <select
            className="input"
            value={values.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="active">active</option>
            <option value="completed">completed</option>
          </select>
        </div>
        <div>
          <label className="label">Start date</label>
          <input
            type="date"
            className="input"
            value={values.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </div>
        <div>
          <label className="label">End date</label>
          <input
            type="date"
            className="input"
            value={values.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-neg">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create cycle"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
