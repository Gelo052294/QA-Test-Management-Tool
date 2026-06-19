// Soft pastel badge palette (light + dark variants via arbitrary values).
const PASTEL = {
  neutral: "bg-subtle text-muted",
  green:
    "bg-[#dcefe3] text-[#357d52] dark:bg-[#1d3328] dark:text-[#82d6a0]",
  rose:
    "bg-[#f8e1de] text-[#a85650] dark:bg-[#33211f] dark:text-[#f0a8a4]",
  amber:
    "bg-[#f7ecd0] text-[#8a6a23] dark:bg-[#352b16] dark:text-[#e6c684]",
  slate:
    "bg-[#e8ebf1] text-[#5b6573] dark:bg-[#262d38] dark:text-[#a9b2bf]",
};

const priorityColors: Record<string, string> = {
  low: PASTEL.neutral,
  medium: PASTEL.slate,
  high: PASTEL.amber,
  critical: PASTEL.rose,
};

const tcStatusColors: Record<string, string> = {
  draft: PASTEL.neutral,
  active: PASTEL.green,
  deprecated: "bg-subtle text-faint",
};

export const execStatusColors: Record<string, string> = {
  not_run: PASTEL.neutral,
  pass: PASTEL.green,
  fail: PASTEL.rose,
  blocked: PASTEL.amber,
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
