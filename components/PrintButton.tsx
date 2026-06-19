"use client";

export default function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn-secondary no-print">
      {label}
    </button>
  );
}
