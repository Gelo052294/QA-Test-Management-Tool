/**
 * One-time: turn existing free-text TestCase.folder labels into real Folder
 * rows (kind=testcase) per project, and link the cases via folderId.
 * Safe to re-run.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cases = await prisma.testCase.findMany({
    where: { folder: { not: null }, folderId: null, projectId: { not: null } },
    select: { id: true, folder: true, projectId: true },
  });

  let created = 0;
  let linked = 0;
  // cache: `${projectId}::${name}` -> folderId
  const cache = new Map<string, string>();

  for (const c of cases) {
    const name = (c.folder ?? "").trim();
    if (!name || !c.projectId) continue;
    const cacheKey = `${c.projectId}::${name}`;

    let folderId = cache.get(cacheKey);
    if (!folderId) {
      const existing = await prisma.folder.findFirst({
        where: { projectId: c.projectId, kind: "testcase", name, parentId: null },
      });
      const folder =
        existing ??
        (await prisma.folder.create({
          data: { projectId: c.projectId, kind: "testcase", name },
        }));
      if (!existing) created += 1;
      folderId = folder.id;
      cache.set(cacheKey, folderId);
    }

    await prisma.testCase.update({ where: { id: c.id }, data: { folderId } });
    linked += 1;
  }

  console.log("Folder migration complete:", { foldersCreated: created, casesLinked: linked });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
