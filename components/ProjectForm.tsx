"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProjectForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, name, description: description || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create project.");
      setSaving(false);
      return;
    }

    // Make the new project the current one.
    const data = await res.json();
    await fetch("/api/projects/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: data.project.id }),
    });

    setSaving(false);
    setKey("");
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem,1fr,1fr,auto] sm:items-end">
      <div>
        <label className="label">Key</label>
        <input
          className="input uppercase"
          placeholder="AUR"
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          maxLength={10}
          required
        />
      </div>
      <div>
        <label className="label">Name</label>
        <input
          className="input"
          placeholder="Aurora Platform"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">Description</label>
        <input
          className="input"
          placeholder="Optional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? "Creating..." : "Create project"}
      </button>
      {error && <p className="text-sm text-neg sm:col-span-4">{error}</p>}
    </form>
  );
}
