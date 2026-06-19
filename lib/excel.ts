import ExcelJS from "exceljs";

export type Step = { step: string; expectedResult: string };

export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Serialize steps into a single multi-line cell: "1. action => expected". */
export function stepsToCell(steps: Step[]): string {
  if (!Array.isArray(steps)) return "";
  return steps
    .map((s, i) => `${i + 1}. ${s.step}${s.expectedResult ? ` => ${s.expectedResult}` : ""}`)
    .join("\n");
}

/** Parse a steps cell back into structured steps (inverse of stepsToCell). */
export function parseStepsCell(text: string | null | undefined): Step[] {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const noNum = line.replace(/^\s*\d+[.)]\s*/, "");
      const [action, expected] = noNum.split("=>");
      return {
        step: (action ?? "").trim(),
        expectedResult: (expected ?? "").trim(),
      };
    })
    .filter((s) => s.step !== "");
}

/** Columns shared by test-case export and the import template. */
export const TEST_CASE_COLUMNS = [
  { header: "Key", key: "key", width: 14 },
  { header: "Title", key: "title", width: 40 },
  { header: "Description", key: "description", width: 40 },
  { header: "Preconditions", key: "preconditions", width: 30 },
  { header: "Priority", key: "priority", width: 12 },
  { header: "Status", key: "status", width: 12 },
  { header: "Folder", key: "folder", width: 20 },
  { header: "Jira Key", key: "jiraKey", width: 14 },
  { header: "Steps", key: "steps", width: 60 },
  { header: "Created By", key: "createdBy", width: 20 },
];

function styleHeader(ws: ExcelJS.Worksheet) {
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEAEEF2" },
  };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

export function buildTestCaseWorkbook(
  projectName: string,
  rows: {
    key: string;
    title: string;
    description: string | null;
    preconditions: string | null;
    priority: string;
    status: string;
    folder: string | null;
    jiraKey: string | null;
    steps: Step[];
    createdBy: string;
  }[]
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QA Test Management";
  const ws = wb.addWorksheet("Test Cases");
  ws.columns = TEST_CASE_COLUMNS;
  for (const r of rows) {
    ws.addRow({
      key: r.key,
      title: r.title,
      description: r.description ?? "",
      preconditions: r.preconditions ?? "",
      priority: r.priority,
      status: r.status,
      folder: r.folder ?? "",
      jiraKey: r.jiraKey ?? "",
      steps: stepsToCell(r.steps),
      createdBy: r.createdBy,
    });
  }
  ws.eachRow((row) => (row.alignment = { vertical: "top", wrapText: true }));
  styleHeader(ws);
  // Record the project in workbook metadata (not a data row, so re-import stays clean).
  wb.title = `Test Cases — ${projectName}`;
  return wb;
}

export function buildCycleWorkbook(
  cycle: { name: string; key: string | null },
  summary: { total: number; passed: number; failed: number; blocked: number; notRun: number; passRate: number },
  rows: {
    key: string;
    title: string;
    status: string;
    executedBy: string;
    executedAt: string;
    defectJiraKey: string;
    comment: string;
  }[]
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "QA Test Management";

  const s = wb.addWorksheet("Summary");
  s.columns = [
    { header: "Metric", key: "m", width: 20 },
    { header: "Value", key: "v", width: 30 },
  ];
  s.addRows([
    { m: "Cycle", v: `${cycle.key ? cycle.key + " · " : ""}${cycle.name}` },
    { m: "Total", v: summary.total },
    { m: "Passed", v: summary.passed },
    { m: "Failed", v: summary.failed },
    { m: "Blocked", v: summary.blocked },
    { m: "Not run", v: summary.notRun },
    { m: "Pass rate", v: `${summary.passRate}%` },
  ]);
  styleHeader(s);

  const ws = wb.addWorksheet("Executions");
  ws.columns = [
    { header: "Test Case", key: "key", width: 14 },
    { header: "Title", key: "title", width: 40 },
    { header: "Result", key: "status", width: 12 },
    { header: "Executed By", key: "executedBy", width: 20 },
    { header: "Executed At", key: "executedAt", width: 22 },
    { header: "Defect", key: "defectJiraKey", width: 14 },
    { header: "Comment", key: "comment", width: 40 },
  ];
  ws.addRows(rows);
  styleHeader(ws);
  return wb;
}
