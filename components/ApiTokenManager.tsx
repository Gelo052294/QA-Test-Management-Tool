"use client";

import { useState } from "react";

export default function ApiTokenManager({ hasToken }: { hasToken: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [exists, setExists] = useState(hasToken);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const res = await fetch("/api/settings/token", { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const data = await res.json();
      setToken(data.apiToken);
      setExists(true);
    }
  }

  async function revoke() {
    if (!confirm("Revoke your API token? Existing scripts will stop working.")) return;
    setBusy(true);
    const res = await fetch("/api/settings/token", { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setToken(null);
      setExists(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Use a personal API token to call the REST API from scripts or CI. Send it as{" "}
        <code className="rounded bg-subtle px-1">Authorization: Bearer &lt;token&gt;</code>.
      </p>

      {token && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-500/30 dark:bg-green-500/10">
          <p className="mb-1 text-sm font-medium text-green-800 dark:text-green-300">
            Your new token (copy it now — it won’t be shown again):
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-surface px-2 py-1 text-xs">{token}</code>
            <button
              className="btn-secondary"
              onClick={() => navigator.clipboard.writeText(token)}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={generate} disabled={busy}>
          {exists ? "Regenerate token" : "Generate token"}
        </button>
        {exists && (
          <button className="btn-danger" onClick={revoke} disabled={busy}>
            Revoke
          </button>
        )}
        {!token && exists && (
          <span className="text-sm text-muted">A token is currently active.</span>
        )}
      </div>
    </div>
  );
}
