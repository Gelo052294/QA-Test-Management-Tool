"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

export default function ThemeSetting() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("theme");
    } catch {}
    setMode(saved === "light" || saved === "dark" ? saved : "system");
  }, []);

  function apply(next: Mode) {
    setMode(next);
    try {
      if (next === "system") {
        localStorage.removeItem("theme");
        const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.classList.toggle("dark", sys);
      } else {
        localStorage.setItem("theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }
    } catch {}
  }

  const options: { value: Mode; label: string; icon: string }[] = [
    { value: "light", label: "Light", icon: "☀️" },
    { value: "dark", label: "Dark", icon: "🌙" },
    { value: "system", label: "System", icon: "🖥️" },
  ];

  return (
    <div className="inline-flex rounded-md border border-line p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => apply(o.value)}
          className={
            mode === o.value
              ? "rounded px-3 py-1.5 text-sm font-medium bg-brand text-white"
              : "rounded px-3 py-1.5 text-sm font-medium text-muted hover:bg-subtle hover:text-ink"
          }
        >
          <span className="mr-1">{o.icon}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}
