"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title={dark ? "Switch to light" : "Switch to dark"}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted hover:bg-subtle hover:text-ink"
    >
      {/* Avoid hydration mismatch: render a neutral icon until mounted */}
      {mounted && dark ? "☀️" : "🌙"}
    </button>
  );
}
