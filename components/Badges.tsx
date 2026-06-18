const priorityColors: Record<string, string> = {
  low: "bg-subtle text-muted",
  medium: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const tcStatusColors: Record<string, string> = {
  draft: "bg-subtle text-muted",
  active: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  deprecated: "bg-subtle text-faint",
};

export const execStatusColors: Record<string, string> = {
  not_run: "bg-subtle text-muted",
  pass: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  fail: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  blocked: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
};

function Pill({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  return <Pill text={value} className={priorityColors[value] ?? "bg-subtle"} />;
}

export function TestCaseStatusBadge({ value }: { value: string }) {
  return <Pill text={value} className={tcStatusColors[value] ?? "bg-subtle"} />;
}

export function ExecutionStatusBadge({ value }: { value: string }) {
  return (
    <Pill
      text={value.replace("_", " ")}
      className={execStatusColors[value] ?? "bg-subtle"}
    />
  );
}
