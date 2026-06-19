/**
 * One-time migration: introduce the Project layer.
 * - Creates a default "General" project (key GEN) if no project exists.
 * - Attaches all existing test cases & cycles to it.
 * - Re-keys them to the per-project scheme (GEN-T1, GEN-C1, ...).
 * Safe to re-run: it only touches rows with a null projectId.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const orphanCases = await prisma.testCase.count({ where: { projectId: null } });
  const orphanCycles = await prisma.testCycle.count({ where: { projectId: null } });

  if (orphanCases === 0 && orphanCycles === 0) {
    const existing = await prisma.project.count();
    console.log(
      `Nothing to migrate (no orphan test cases/cycles). Projects in DB: ${existing}.`
    );
    return;
  }

  // Pick an owner: an admin if available, else the first user.
  const owner =
    (await prisma.user.findFirst({ where: { role: "admin" }, orderBy: { createdAt: "asc" } })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!owner) throw new Error("No users exist; cannot assign a project owner.");

  // Reuse an existing GEN project or create one.
  const project =
    (await prisma.project.findUnique({ where: { key: "GEN" } })) ??
    (await prisma.project.create({
      data: {
        key: "GEN",
        name: "General",
        description: "Default project for items created before projects existed.",
        createdById: owner.id,
      },
    }));

  // Re-key test cases in stable order.
  const cases = await prisma.testCase.findMany({
    where: { projectId: null },
    orderBy: { seq: "asc" },
  });
  let tc = project.tcCounter;
  for (const c of cases) {
    tc += 1;
    await prisma.testCase.update({
      where: { id: c.id },
      data: { projectId: project.id, key: `${project.key}-T${tc}` },
    });
  }

  // Re-key cycles in stable order.
  const cycles = await prisma.testCycle.findMany({
    where: { projectId: null },
    orderBy: { createdAt: "asc" },
  });
  let cy = project.cyCounter;
  for (const c of cycles) {
    cy += 1;
    await prisma.testCycle.update({
      where: { id: c.id },
      data: { projectId: project.id, key: `${project.key}-C${cy}` },
    });
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { tcCounter: tc, cyCounter: cy },
  });

  console.log("Migration complete:", {
    project: `${project.key} (${project.name})`,
    testCasesMoved: cases.length,
    cyclesMoved: cycles.length,
    tcCounter: tc,
    cyCounter: cy,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
