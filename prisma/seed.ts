import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash,
      role: "admin",
    },
  });

  const tester = await prisma.user.upsert({
    where: { email: "tester@example.com" },
    update: {},
    create: {
      email: "tester@example.com",
      name: "Tester User",
      passwordHash,
      role: "tester",
    },
  });

  // Demo project (test cases & cycles live inside a project)
  const project = await prisma.project.upsert({
    where: { key: "DEMO" },
    update: {},
    create: {
      key: "DEMO",
      name: "Demo Project",
      description: "Sample project with demo test cases and a cycle.",
      tcCounter: 2,
      cyCounter: 1,
      createdById: admin.id,
    },
  });

  // A couple of demo test cases
  const tc1 = await prisma.testCase.upsert({
    where: { key: "DEMO-T1" },
    update: {},
    create: {
      key: "DEMO-T1",
      projectId: project.id,
      title: "User can log in with valid credentials",
      description: "Verify a registered user can sign in.",
      preconditions: "A user account exists.",
      steps: [
        { step: "Navigate to /login", expectedResult: "Login form is shown" },
        { step: "Enter valid email and password", expectedResult: "Fields accept input" },
        { step: "Click Sign in", expectedResult: "User lands on the dashboard" },
      ],
      priority: "high",
      status: "active",
      folder: "Authentication",
      jiraKey: "QA-101",
      createdById: admin.id,
    },
  });

  const tc2 = await prisma.testCase.upsert({
    where: { key: "DEMO-T2" },
    update: {},
    create: {
      key: "DEMO-T2",
      projectId: project.id,
      title: "User cannot log in with wrong password",
      description: "Verify invalid credentials are rejected.",
      preconditions: "A user account exists.",
      steps: [
        { step: "Navigate to /login", expectedResult: "Login form is shown" },
        { step: "Enter valid email and wrong password", expectedResult: "Fields accept input" },
        { step: "Click Sign in", expectedResult: "An error message is displayed" },
      ],
      priority: "medium",
      status: "active",
      folder: "Authentication",
      jiraKey: "QA-101",
      createdById: tester.id,
    },
  });

  // A demo cycle with both test cases queued for execution
  const cycle = await prisma.testCycle.create({
    data: {
      key: "DEMO-C1",
      projectId: project.id,
      name: "Sprint 1 Regression",
      description: "Smoke + auth regression for Sprint 1.",
      status: "active",
      createdById: admin.id,
      executions: {
        create: [
          { testCaseId: tc1.id, status: "pass", executedById: tester.id, executedAt: new Date() },
          { testCaseId: tc2.id, status: "not_run" },
        ],
      },
    },
  });

  console.log("Seeded:", {
    admin: admin.email,
    tester: tester.email,
    testCases: [tc1.key, tc2.key],
    cycle: cycle.name,
    note: "Default password for both users is 'password123'",
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
