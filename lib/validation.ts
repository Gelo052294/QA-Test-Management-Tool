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

export const projectCreateSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, "Key must be 2-10 letters/digits, starting with a letter"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export const folderCreateSchema = z.object({
  projectId: z.string().min(1),
  kind: z.enum(["testcase", "cycle"]),
  name: z.string().trim().min(1, "Folder name is required").max(80),
  parentId: z.string().nullish(), // accepts string | null | undefined
});

export const folderUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const testCaseCreateSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  steps: z.array(step).default([]),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["draft", "active", "deprecated"]).default("active"),
  folderId: z.string().nullable().optional(),
  jiraKey,
});

// Updates can't move a test case to another project or change its key.
export const testCaseUpdateSchema = testCaseCreateSchema.omit({ projectId: true }).partial();

const cycleBase = z.object({
  projectId: z.string().min(1, "Project is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed"]).default("active"),
  startDate: z.coerce.date({ required_error: "Start date is required", invalid_type_error: "Start date is required" }),
  endDate: z.coerce.date({ required_error: "End date is required", invalid_type_error: "End date is required" }),
  folderId: z.string().nullable().optional(),
});

// On create, both dates are required and end must not precede start.
export const cycleCreateSchema = cycleBase.refine(
  (d) => d.endDate >= d.startDate,
  { message: "End date must be on or after the start date", path: ["endDate"] }
);

export const cycleDuplicateSchema = z.object({
  name: z.string().trim().min(1, "A new name is required"),
});

// On edit, all fields optional (dates already set at creation).
export const cycleUpdateSchema = cycleBase.omit({ projectId: true }).partial();

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
