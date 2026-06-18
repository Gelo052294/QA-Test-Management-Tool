// Jira linking is "link-only": we store the issue key and build a URL.

export const JIRA_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

export function isValidJiraKey(key: string): boolean {
  return JIRA_KEY_PATTERN.test(key.trim());
}

/** Returns a clickable Jira URL, or null if base URL/key is missing. */
export function jiraUrl(key?: string | null): string | null {
  if (!key) return null;
  const base = process.env.JIRA_BASE_URL || process.env.NEXT_PUBLIC_JIRA_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/browse/${key.trim()}`;
}
