"use client";

import { useRouter } from "next/navigation";

export default function CycleCard({
  id,
  cycleKey,
  name,
  status,
  total,
  passed,
  pct,
}: {
  id: string;
  cycleKey: string | null;
  name: string;
  status: string;
  total: number;
  passed: number;
  pct: number;
}) {
  const router = useRouter();

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => router.push(`/cycles/${id}`)}
      className="card cursor-pointer hover:shadow-md active:cursor-grabbing"
      title="Open — or drag onto a folder to move"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">
          {cycleKey && <span className="mr-1 font-mono text-xs text-faint">{cycleKey}</span>}
          {name}
        </h2>
        <span
          className={`rounded px-2 py-0.5 text-xs ${
            status === "active"
              ? "bg-[#dcefe3] text-[#357d52] dark:bg-[#1d3328] dark:text-[#82d6a0]"
              : "bg-subtle text-muted"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mb-3 text-sm text-muted">
        {total} test{total === 1 ? "" : "s"} · {passed} passed
      </p>
      <div className="h-2 w-full rounded-full bg-subtle">
        <div className="h-2 rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-faint">{pct}% executed</p>
    </div>
  );
}
