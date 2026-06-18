"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function SearchBox({ placeholder }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams(params.toString());
    if (value.trim()) sp.set("q", value.trim());
    else sp.delete("q");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="btn-secondary">
        Search
      </button>
    </form>
  );
}
