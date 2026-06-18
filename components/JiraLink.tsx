const base = process.env.NEXT_PUBLIC_JIRA_BASE_URL;

export default function JiraLink({ jiraKey }: { jiraKey?: string | null }) {
  if (!jiraKey) return <span className="text-faint">—</span>;
  if (!base) {
    return <span className="font-mono text-sm">{jiraKey}</span>;
  }
  return (
    <a
      href={`${base.replace(/\/$/, "")}/browse/${jiraKey}`}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-sm text-brand hover:underline"
    >
      {jiraKey}
    </a>
  );
}
