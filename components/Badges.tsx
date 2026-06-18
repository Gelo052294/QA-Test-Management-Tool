const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const tcStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  deprecated: "bg-gray-200 text-gray-500",
};

export const execStatusColors: Record<string, string> = {
  not_run: "bg-gray-100 text-gray-600",
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  blocked: "bg-yellow-100 text-yellow-700",
};

function Pill({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${className}`}>
      {text}
    </span>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  return <Pill text={value} className={priorityColors[value] ?? "bg-gray-100"} />;
}

export function TestCaseStatusBadge({ value }: { value: string }) {
  return <Pill text={value} className={tcStatusColors[value] ?? "bg-gray-100"} />;
}

export function ExecutionStatusBadge({ value }: { value: string }) {
  return (
    <Pill
      text={value.replace("_", " ")}
      className={execStatusColors[value] ?? "bg-gray-100"}
    />
  );
}
