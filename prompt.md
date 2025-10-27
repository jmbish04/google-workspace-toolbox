# 🧠 Project Brief: Agentic Google Workspace Core Service (Cloudflare Workers)

**To:** Jules
**Goal:** Implement the complete system as defined in `workspace-api-definitions.md`
**Frameworks:** Cloudflare Workers + Hono + Workers AI + Cloudflare Agent SDK + D1 + TypeScript
**Architecture:** Monorepo with Yarn/NPM Workspaces

---

## 🎯 Core Objectives

1. **Scaffold the Monorepo**

   * Create all packages and files as defined in `workspace-api-definitions.md`.

2. **Implement Core Service (`worker-main`)**

   * Central Worker using **Hono** for routing.

3. **Implement AI Agent (`worker-health-agent`)**

   * Analyze logs using **Cloudflare Agent SDK** + **Workers AI**.

4. **Build Health Check System**

   * End-to-end flow:
     `Trigger (API/UI/Cron)` → `Run Tests` → `Save Logs to D1` → `Trigger AI Analysis` → `Save Analysis to D1`.

5. **A2A (App-to-App) Design**

   * `worker-main` handles **Google Auth** and exposes Google API endpoints for other services.

---

## 🧩 Step-by-Step Implementation Plan

### 1. Root Setup

* Initialize the **monorepo** with Yarn/NPM workspaces.
* Create a shared **`tsconfig.base.json`**.

---

### 2. D1 Schema — `packages/db-schema`

**Migration File:** `0001_create_health_reports.sql`

```sql
CREATE TABLE health_reports (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('RUNNING', 'ANALYZING', 'COMPLETE', 'ERROR'))
);

CREATE TABLE health_runs (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  service_name TEXT CHECK(service_name IN ('drive', 'docs', 'sheets', 'appsscript')),
  status TEXT CHECK(status IN ('SUCCESS', 'FAILURE')),
  FOREIGN KEY(report_id) REFERENCES health_reports(id)
);

CREATE TABLE health_logs (
  id TEXT PRIMARY KEY,
  run_id TEXT,
  logs_json TEXT,
  FOREIGN KEY(run_id) REFERENCES health_runs(id)
);

CREATE TABLE ai_analysis (
  id TEXT PRIMARY KEY,
  report_id TEXT,
  human_summary TEXT,
  dev_agent_prompt TEXT,
  overall_fix_prompt TEXT,
  FOREIGN KEY(report_id) REFERENCES health_reports(id)
);
```

---

### 3. Internal SDK (Example: `packages/drive`)

**`DriveClient` & `request.ts`:**

* Implement robust, structured JSON logging.
* Use standardized request handling for Google API calls.

**Health Check Implementation:**
`src/health-checks/drive-health.ts`

```ts
export async function runDriveHealthChecks(client) {
  const results = [];
  const logs = [];

  try {
    const file = await client.files.createTestFile();
    const list = await client.files.listFiles();
    await client.files.deleteFile(file.id);

    results.push({ testName: 'drive_basic_ops', success: true, error: null });
  } catch (e) {
    results.push({ testName: 'drive_basic_ops', success: false, error: e.message });
  }

  return { results, logs };
}
```

---

### 4. `worker-main` — Core Service

**Wrangler Bindings:**

```toml
[[d1_databases]]
binding = "DB"
database_name = "workspace_health"

[[services]]
binding = "HEALTH_AGENT"
service = "worker-health-agent"

[triggers]
crons = ["0 4 * * *"]
```

**Main Entrypoint:**
`src/index.ts`

```ts
import { Hono } from 'hono';
import { api } from './api';
import { health } from './health';
import { frontend } from './frontend';

const app = new Hono();
app.route('/api', api);
app.route('/health', health);
app.route('/', frontend);

export default {
  fetch: app.fetch,
  scheduled: app.scheduled,
};
```

**Core Health Coordinator:**
`src/health.ts`

```ts
app.post('/run', async (c) => {
  const db = c.env.DB;
  const client = getDriveClient(c.env);

  const reportId = await db.insert('health_reports', { status: 'RUNNING' });

  const { results, logs } = await runDriveHealthChecks(client);

  await db.insert('health_runs', { report_id: reportId, service_name: 'drive', status: 'SUCCESS' });
  await db.insert('health_logs', { run_id: reportId, logs_json: JSON.stringify(logs) });

  await db.update('health_reports', { id: reportId, status: 'ANALYZING' });

  await c.env.HEALTH_AGENT.fetch('https://agent.workers.dev', {
    method: 'POST',
    body: JSON.stringify({ reportId }),
  });

  return c.json({ message: 'Health check started', reportId });
});
```

---

### 5. `worker-health-agent` — AI Log Analyzer

**Wrangler Bindings:**

```toml
[[d1_databases]]
binding = "DB"
database_name = "workspace_health"

[[ai]]
binding = "AI"
type = "workers-ai"
```

**Tool Definition:**
`src/tools.ts`

```ts
export const get_logs_from_report = async (reportId, db) => {
  const runs = await db.prepare('SELECT * FROM health_runs WHERE report_id=?').bind(reportId).all();
  const logs = await db.prepare('SELECT * FROM health_logs WHERE run_id IN (?)').bind(runs.map(r => r.id)).all();
  return JSON.stringify({ runs, logs });
};
```

**Agent Implementation:**
`src/agent.ts`

```ts
import { Agent } from '@cloudflare/agents';

const persona = `
You are a specialized Google Workspace system health analyst.
Analyze test logs and produce a structured JSON summary including:
1. human_summary
2. dev_agent_prompt
3. overall_fix_prompt
`;

export const agent = new Agent({
  tools: [get_logs_from_report],
});
```

**Main Handler:**
`src/index.ts`

```ts
app.post('/', async (c) => {
  const db = c.env.DB;
  const { reportId } = await c.req.json();

  const { response } = await agent.run(persona, `Analyze logs for report ${reportId}`, { reportId });
  const analysis = JSON.parse(response);

  await db.insert('ai_analysis', { report_id: reportId, ...analysis });
  await db.update('health_reports', { id: reportId, status: 'COMPLETE' });

  return c.text('Analysis complete');
});
```

---

### 6. UI Dashboard — `packages/ui-dashboard`

**`index.html`:**

```html
<button id="run-health">Run Health Check</button>
<pre id="output"></pre>
<script src="main.js"></script>
```

**`main.js`:**

```js
document.getElementById('run-health').addEventListener('click', async () => {
  const res = await fetch('/health/run', { method: 'POST' });
  const json = await res.json();
  document.getElementById('output').textContent = JSON.stringify(json, null, 2);
});
```

---

### 7. Parallel SDKs (Docs, Sheets, Apps Script)

Follow the same pattern as the **Drive SDK**, each with:

* `Client` class
* `health-checks/<service>-health.ts`
* Integration tests
* Structured JSON output

---

## ✅ Priority Focus Areas

* `worker-main` coordinator flow
* `worker-health-agent` AI logic
* `drive-health.ts` test runner

---


