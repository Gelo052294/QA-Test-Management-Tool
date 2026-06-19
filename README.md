# QA Test Management Tool

A simple, Zephyr Scale–style test management tool built with **Next.js**, **Prisma + Postgres**, **Auth.js**, and **Vercel Blob**. It lets you:

- Manage **test cases** (steps, priority, status, folder, Jira link)
- Group them into **test cycles** and **execute** them (pass / fail / blocked / not run)
- Track **who created** and **who executed** each test (email + password login)
- Attach **test evidence** files to executions
- Link everything to **Jira tickets** (link-only — no Jira API needed)
- Generate **reports**: cycle summary, monthly execution, per-tester activity, Jira coverage (with CSV export)
- Do all of the above over a **REST API** (create / edit / delete + evidence upload)

---

## Tech stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | Next.js (App Router) + TypeScript       |
| Styling        | Tailwind CSS                            |
| Database       | Postgres (Vercel Postgres / Neon)       |
| ORM            | Prisma                                   |
| Auth           | Auth.js (NextAuth v5), email + password |
| File storage   | Vercel Blob (test evidence)             |
| Hosting        | Vercel                                   |

---

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env`** from the example and fill in the values:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL` — a Postgres connection string. Free option: create a database at [neon.tech](https://neon.tech).
   - `AUTH_SECRET` — generate one with `npx auth secret`.
   - `BLOB_READ_WRITE_TOKEN` — only needed for evidence uploads (from Vercel Blob).
   - `JIRA_BASE_URL` / `NEXT_PUBLIC_JIRA_BASE_URL` — e.g. `https://your-company.atlassian.net`.

3. **Create the database schema**
   ```bash
   npm run db:push      # pushes the Prisma schema to your database
   npm run db:seed      # optional: seeds demo users + data
   ```
   The seed creates `admin@example.com` and `tester@example.com`, both with password `password123`.

4. **Run it**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and register an account (or use a seeded one).

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project** → import the repo.
3. Under **Storage**, create a **Postgres** database and a **Blob** store (Vercel wires `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` automatically).
4. Add the remaining env vars in **Settings → Environment Variables**: `AUTH_SECRET`, `JIRA_BASE_URL`, `NEXT_PUBLIC_JIRA_BASE_URL`.
5. Deploy. After the first deploy, run the schema push against the production DB:
   ```bash
   # locally, pointing DATABASE_URL at the production database
   npm run db:push
   ```

> Note: data is stored in Postgres + Blob, not on disk — Vercel's filesystem is read-only/ephemeral.

---

## REST API

All endpoints require authentication. From scripts, generate a personal token at **Settings → API token** and send it as a Bearer header:

```
Authorization: Bearer qatms_xxxxxxxx...
```

### Test cases
| Method | Path                    | Body / notes                                  |
| ------ | ----------------------- | --------------------------------------------- |
| GET    | `/api/test-cases`       | `?q=&folder=&jiraKey=&status=` filters        |
| POST   | `/api/test-cases`       | `{ title, description?, preconditions?, steps?, priority?, status?, folder?, jiraKey? }` |
| GET    | `/api/test-cases/:id`   |                                               |
| PATCH  | `/api/test-cases/:id`   | any subset of the create fields               |
| DELETE | `/api/test-cases/:id`   |                                               |

`steps` is an array of `{ "step": "...", "expectedResult": "..." }`.

### Test cycles
| Method | Path                       | Body / notes                                       |
| ------ | -------------------------- | -------------------------------------------------- |
| GET    | `/api/cycles`              |                                                    |
| POST   | `/api/cycles`              | `{ name, description?, status?, startDate?, endDate? }` |
| GET    | `/api/cycles/:id`          |                                                    |
| PATCH  | `/api/cycles/:id`          |                                                    |
| DELETE | `/api/cycles/:id`          |                                                    |
| POST   | `/api/cycles/:id/items`    | `{ testCaseIds: ["..."] }` — adds cases to a cycle |

### Executions & evidence
| Method | Path                                | Body / notes                                          |
| ------ | ----------------------------------- | ----------------------------------------------------- |
| PATCH  | `/api/executions/:id`               | `{ status, comment?, defectJiraKey? }` (status: `not_run`/`pass`/`fail`/`blocked`) |
| DELETE | `/api/executions/:id`               | removes the test case from the cycle                  |
| GET    | `/api/executions/:id/evidence`      |                                                       |
| POST   | `/api/executions/:id/evidence`      | `multipart/form-data` with a `file` field             |
| DELETE | `/api/evidence/:id`                 |                                                       |

### Reports (add `&format=csv` for CSV)
- `GET /api/reports/cycle-summary?cycleId=...`
- `GET /api/reports/monthly?month=YYYY-MM`
- `GET /api/reports/testers`
- `GET /api/reports/jira-coverage`

### Examples

```bash
TOKEN="qatms_xxxxxxxx"
BASE="http://localhost:3000"

# Create a test case
curl -X POST "$BASE/api/test-cases" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login works",
    "priority": "high",
    "jiraKey": "QA-101",
    "steps": [{ "step": "Go to /login", "expectedResult": "Form shows" }]
  }'

# Edit it
curl -X PATCH "$BASE/api/test-cases/<id>" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "status": "deprecated" }'

# Delete it
curl -X DELETE "$BASE/api/test-cases/<id>" -H "Authorization: Bearer $TOKEN"

# Upload evidence to an execution
curl -X POST "$BASE/api/executions/<executionId>/evidence" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./screenshot.png"
```

---

## MCP server (record results from Claude)

Claude can record execution results, upload evidence, create cases/cycles, and read
reports using your API token. Two options:
- **Remote (hosted):** the app serves an MCP endpoint at `/api/mcp` — teammates connect by
  URL + their own token, no install.
- **Local (stdio):** run [`mcp/server.mjs`](./mcp).

See [`mcp/README.md`](./mcp/README.md) for setup.

## Project structure

```
app/
  (auth)/            login + register pages
  (app)/             authenticated UI (dashboard, test-cases, cycles, reports, settings)
  api/               REST API route handlers
components/          reusable UI + client forms
lib/                 db, auth, validation, reports, jira, csv helpers
prisma/              schema + seed
```

---

## Reports explained

1. **Test cycle summary** — pass/fail/blocked/not-run counts, pass rate and % executed for one cycle.
2. **Monthly execution** — everything executed in a given month, broken down by tester.
3. **Per-tester activity** — how many test cases each user created and executed.
4. **Jira coverage** — which Jira tickets have linked test cases and their latest result (traceability).
