"use client";

import { useRouter } from "next/navigation";

export default function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  return (
    <input
      type="month"
      className="input w-auto"
      value={month}
      onChange={(e) => router.push(`/reports/monthly?month=${e.target.value}`)}
    />
  );
}
