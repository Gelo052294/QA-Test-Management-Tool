import { z } from "zod";
import { JIRA_KEY_PATTERN } from "@/lib/jira";

const jiraKey = z
  .string()
  .trim()
  .regex(JIRA_KEY_PATTERN, "Jira key must look like PROJ-123")
  .optional()
  .or(z.literal("").transform(() => undefined));

const step = z.object({
  step: z.string().min(1),
  expectedResult: z.string().default(""),
});

export const testCaseCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  steps: z.array(step).default([]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["draft", "active", "deprecated"]).default("active"),
  folder: z.string().optional(),
  jiraKey,
});

export const testCaseUpdateSchema = testCaseCreateSchema.partial();

export const cycleCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed"]).default("active"),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const cycleUpdateSchema = cycleCreateSchema.partial();

export const addItemsSchema = z.object({
  testCaseIds: z.array(z.string().min(1)).min(1, "Pick at least one test case"),
});

export const executionUpdateSchema = z.object({
  status: z.enum(["not_run", "pass", "fail", "blocked"]),
  comment: z.string().optional(),
  defectJiraKey: jiraKey,
});

export type TestCaseInput = z.infer<typeof testCaseCreateSchema>;
export type CycleInput = z.infer<typeof cycleCreateSchema>;
