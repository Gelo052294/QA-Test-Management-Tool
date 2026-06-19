# QA TMS — MCP server

An [MCP](https://modelcontextprotocol.io) server that lets an MCP client (e.g. Claude
Desktop or Claude Code) record test execution results and upload evidence into the
QA Test Management Tool. It talks to the app's REST API using a personal API token.

## Tools exposed

| Tool | What it does |
| --- | --- |
| `qa_list_projects` | List projects (key — name). |
| `qa_list_cycles` | List test cycles (optionally `projectKey`). |
| `qa_list_cycle_tests` | List a cycle's test cases + current result (`cycleKey`). |
| `qa_set_result` | Record a result: `cycleKey`, `testCaseKey`, `status` (`not_run`/`pass`/`fail`/`blocked`), optional `comment`, `defectJiraKey`. |
| `qa_upload_evidence` | Upload a file to an execution: `cycleKey`, `testCaseKey`, `filePath`. |

## Setup

1. **Install deps** (once):
   ```bash
   cd mcp
   npm install
   ```

2. **Get an API token**: in the app, go to **Settings → API token → Generate token** and copy it.

3. **Configure your MCP client** with two env vars:
   - `QATMS_BASE_URL` — your deployed app URL, e.g. `https://your-app.vercel.app`
   - `QATMS_API_TOKEN` — the token from step 2

### Claude Code
```bash
claude mcp add qa-tms \
  --env QATMS_BASE_URL=https://your-app.vercel.app \
  --env QATMS_API_TOKEN=qatms_xxxxxxxx \
  -- node "C:/QA Test Management Tool/mcp/server.mjs"
```

### Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "qa-tms": {
      "command": "node",
      "args": ["C:/QA Test Management Tool/mcp/server.mjs"],
      "env": {
        "QATMS_BASE_URL": "https://your-app.vercel.app",
        "QATMS_API_TOKEN": "qatms_xxxxxxxx"
      }
    }
  }
}
```

## Usage examples (in chat)

- "List the test cases in cycle AUR-C1."
- "Mark AUR-T12 as **pass** in AUR-C1 with comment 'verified on staging'."
- "AUR-T15 **failed** in AUR-C1 — log defect PROJ-789 and upload `C:/runs/aur-t15.png` as evidence."

The result and evidence are written straight into the tool, and (because the API token
is tied to your account) the execution is attributed to you, with an entry in the cycle's
change history.

## Notes
- The token grants full API access as your user — keep it secret; regenerate/revoke it
  in Settings if it leaks.
- Evidence upload requires the app's Blob storage to be configured (it is, on Vercel).
