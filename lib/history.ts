import { prisma } from "@/lib/db";

export type HistoryEntry = {
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
};

/** Record cycle change-history entries, skipping no-op changes. */
export async function recordCycleHistory(
  cycleId: string,
  changedById: string,
  entries: HistoryEntry[]
) {
  const data = entries
    .filter((e) => (e.oldValue ?? "") !== (e.newValue ?? ""))
    .map((e) => ({
      cycleId,
      changedById,
      field: e.field,
      oldValue: e.oldValue ?? null,
      newValue: e.newValue ?? null,
    }));
  if (data.length) {
    await prisma.cycleHistory.createMany({ data });
  }
}

/** Record test-case change-history entries, skipping no-op changes. */
export async function recordTestCaseHistory(
  testCaseId: string,
  changedById: string,
  entries: HistoryEntry[]
) {
  const data = entries
    .filter((e) => (e.oldValue ?? "") !== (e.newValue ?? ""))
    .map((e) => ({
      testCaseId,
      changedById,
      field: e.field,
      oldValue: e.oldValue ?? null,
      newValue: e.newValue ?? null,
    }));
  if (data.length) {
    await prisma.testCaseHistory.createMany({ data });
  }
}

/** Format a date for history values (e.g. 19/Mar/2026). */
export function histDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return d.toISOString().slice(0, 10);
}

/** Compact text representation of steps for history diffs. */
export function stepsToText(steps: unknown): string {
  if (!Array.isArray(steps)) return "";
  return steps
    .map((s: any, i) => `${i + 1}. ${s?.step ?? ""}${s?.expectedResult ? ` => ${s.expectedResult}` : ""}`)
    .join(" | ");
}
