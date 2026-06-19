import { prisma } from "@/lib/db";

export type StatusCounts = {
  pass: number;
  fail: number;
  blocked: number;
  not_run: number;
};

function emptyCounts(): StatusCounts {
  return { pass: 0, fail: 0, blocked: 0, not_run: 0 };
}

function rate(pass: number, executed: number) {
  return executed ? Math.round((pass / executed) * 100) : 0;
}

/** 1. Test cycle summary — counts + pass rate + progress for one cycle. */
export async function cycleSummary(cycleId: string) {
  const cycle = await prisma.testCycle.findUnique({
    where: { id: cycleId },
    include: {
      createdBy: { select: { name: true } },
      executions: {
        include: {
          testCase: { select: { key: true, title: true } },
          executedBy: { select: { name: true } },
        },
      },
    },
  });
  if (!cycle) return null;

  const counts = emptyCounts();
  for (const e of cycle.executions) counts[e.status] += 1;
  const total = cycle.executions.length;
  const executed = total - counts.not_run;

  return {
    cycle: { id: cycle.id, name: cycle.name, status: cycle.status, createdBy: cycle.createdBy.name },
    total,
    executed,
    counts,
    passRate: rate(counts.pass, executed),
    progress: total ? Math.round((executed / total) * 100) : 0,
    rows: cycle.executions.map((e) => ({
      key: e.testCase.key,
      title: e.testCase.title,
      status: e.status,
      executedBy: e.executedBy?.name ?? "",
      executedAt: e.executedAt ? e.executedAt.toISOString() : "",
      defectJiraKey: e.defectJiraKey ?? "",
      comment: e.comment ?? "",
    })),
  };
}

/** 2. Monthly execution report — executions stamped within the given YYYY-MM (optionally scoped to a project). */
export async function monthlyReport(month: string, projectId?: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const executions = await prisma.testExecution.findMany({
    where: {
      executedAt: { gte: start, lt: end },
      ...(projectId ? { cycle: { projectId } } : {}),
    },
    include: {
      executedBy: { select: { name: true } },
      testCase: { select: { key: true, title: true } },
      cycle: { select: { name: true } },
    },
    orderBy: { executedAt: "asc" },
  });

  const counts = emptyCounts();
  const byTester = new Map<string, StatusCounts>();
  for (const e of executions) {
    counts[e.status] += 1;
    const name = e.executedBy?.name ?? "Unknown";
    if (!byTester.has(name)) byTester.set(name, emptyCounts());
    byTester.get(name)![e.status] += 1;
  }
  const executed = executions.length;

  return {
    month,
    totalExecuted: executed,
    counts,
    passRate: rate(counts.pass, executed),
    byTester: Array.from(byTester.entries()).map(([name, c]) => ({
      name,
      ...c,
      passRate: rate(c.pass, c.pass + c.fail + c.blocked),
    })),
    rows: executions.map((e) => ({
      executedAt: e.executedAt ? e.executedAt.toISOString() : "",
      key: e.testCase.key,
      title: e.testCase.title,
      cycle: e.cycle.name,
      status: e.status,
      executedBy: e.executedBy?.name ?? "",
    })),
  };
}

/** 3. Per-tester activity — created test cases + executions run (optionally scoped to a project). */
export async function testerActivity(projectId?: string) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const created = await prisma.testCase.groupBy({
    by: ["createdById"],
    where: projectId ? { projectId } : {},
    _count: { _all: true },
  });
  const createdByUser = new Map(created.map((c) => [c.createdById, c._count._all]));

  const execs = await prisma.testExecution.groupBy({
    by: ["executedById", "status"],
    where: {
      executedById: { not: null },
      ...(projectId ? { cycle: { projectId } } : {}),
    },
    _count: { _all: true },
  });
  const execByUser = new Map<string, StatusCounts>();
  for (const e of execs) {
    if (!e.executedById) continue;
    if (!execByUser.has(e.executedById)) execByUser.set(e.executedById, emptyCounts());
    execByUser.get(e.executedById)![e.status] += e._count._all;
  }

  return users.map((u) => {
    const counts = execByUser.get(u.id) ?? emptyCounts();
    const ran = counts.pass + counts.fail + counts.blocked;
    return {
      name: u.name,
      email: u.email,
      testCasesCreated: createdByUser.get(u.id) ?? 0,
      executionsRun: ran,
      ...counts,
      passRate: rate(counts.pass, ran),
    };
  });
}

/** 4. Jira coverage — group linked test cases + their latest result (optionally scoped to a project). */
export async function jiraCoverage(projectId?: string) {
  const testCases = await prisma.testCase.findMany({
    where: { jiraKey: { not: null }, ...(projectId ? { projectId } : {}) },
    include: {
      executions: {
        orderBy: [{ executedAt: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
    orderBy: { jiraKey: "asc" },
  });

  const byKey = new Map<
    string,
    { jiraKey: string; testCases: { key: string; title: string; latestStatus: string }[] }
  >();

  for (const tc of testCases) {
    const k = tc.jiraKey!;
    if (!byKey.has(k)) byKey.set(k, { jiraKey: k, testCases: [] });
    byKey.get(k)!.testCases.push({
      key: tc.key,
      title: tc.title,
      latestStatus: tc.executions[0]?.status ?? "not_run",
    });
  }

  return Array.from(byKey.values()).map((g) => ({
    jiraKey: g.jiraKey,
    linkedCount: g.testCases.length,
    testCases: g.testCases,
  }));
}
