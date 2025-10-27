# 🧠 Self-Healing Agentic Google Workspace Core Service

**Platform:** Cloudflare Workers
**Design:** Monorepo with modular Google API SDKs, AI-driven health reporting, and self-repair capabilities

---

## 🧩 Overview

This repository defines a **self-healing, agentic Google Workspace core service** designed to run entirely on **Cloudflare Workers**.

Each Google API (Drive, Docs, Sheets, Apps Script) is modularized into its own internal package and exposed through a central **A2A-optimized `worker-main`**.

Health monitoring and automated recovery are handled by a separate **AI-driven worker (`worker-health-agent`)** that performs log analysis and fix generation, storing results in **Cloudflare D1**.

---

## 🏗️ Monorepo Structure

```bash
workspace-api-modules/
├── package.json               # Root workspace settings
├── tsconfig.base.json         # Shared TS config
├── README.md
│
└── /packages
    ├── /drive/                # Internal Google Drive SDK
    ├── /docs/                 # Internal Google Docs SDK
    ├── /sheets/               # Internal Google Sheets SDK
    ├── /appsscript/           # Internal Google Apps Script SDK
    │
    ├── /db-schema/            # D1 database migrations
    ├── /ui-dashboard/         # Simple HTML/JS frontend for health checks
    ├── /worker-main/          # Core Service: API, UI, and health orchestration
    └── /worker-health-agent/  # AI Agent: Log analysis and fix generation
```

---

## 📦 Root-Level Files

### `package.json`

```json
{
  "name": "workspace-api-modules",
  "private": true,
  "version": "0.1.0",
  "workspaces": [
    "packages/drive",
    "packages/docs",
    "packages/sheets",
    "packages/appsscript",
    "packages/db-schema",
    "packages/ui-dashboard",
    "packages/worker-main",
    "packages/worker-health-agent"
  ],
  "devDependencies": {
    "typescript": "^5.4.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1",
    "@types/jest": "^29.5.0",
    "eslint": "^8.57.0",
    "@typescript-eslint/parser": "^6.9.0",
    "@typescript-eslint/eslint-plugin": "^6.9.0",
    "wrangler": "^3.0.0",
    "hono": "^4.0.0"
  },
  "scripts": {
    "build": "tsc -b packages/*",
    "test": "jest --passWithNoTests",
    "lint": "eslint packages/**/*.ts",
    "dev": "wrangler dev -c packages/worker-main/wrangler.toml",
    "deploy": "wrangler deploy -c packages/worker-main/wrangler.toml",
    "deploy-agent": "wrangler deploy -c packages/worker-health-agent/wrangler.toml",
    "db:migrate": "wrangler d1 migrations apply DB packages/db-schema/migrations"
  }
}
```

---

### `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "moduleResolution": "NodeNext",
    "moduleDetection": "force",
    "resolveJsonModule": true,
    "outDir": "dist",
    "skipLibCheck": true
  },
  "include": ["packages"]
}
```

---

## 📁 Package Structures

### 1. Internal SDKs

**Directories:** `/drive`, `/docs`, `/sheets`, `/appsscript`

Each SDK maintains a flow-based API structure with a dedicated **`/health-checks`** directory containing integration tests.

```bash
packages/drive/
├── package.json
├── tsconfig.json
├── README.md
│
└── /src
    ├── index.ts
    ├── constants.ts
    │
    ├── /client
    │   ├── DriveClient.ts
    │   └── request.ts
    │
    ├── /flows
    │   ├── 1-files.ts
    │   ├── 2-managing.ts
    │   └── ... (all other flows)
    │
    ├── /types
    │   ├── index.ts
    │   └── ... (type definitions)
    │
    ├── /tests
    │   ├── files-flow.test.ts
    │   └── ... (unit tests)
    │
    └── /health-checks
        └── drive-health.ts
```

> This structure is repeated for `docs`, `sheets`, and `appsscript`.

---

### 2. Core Packages

#### `/packages/db-schema`

```bash
db-schema/
└── /migrations
    └── 0001_create_health_reports.sql
```

---

#### `/packages/ui-dashboard`

*(Served statically by `worker-main`)*

```bash
ui-dashboard/
├── index.html
└── main.js
```

---

#### `/packages/worker-main`

**Core Service Worker**

```bash
worker-main/
├── wrangler.toml
├── package.json
├── tsconfig.json
│
└── /src
    ├── index.ts         # Worker entry (Hono router)
    ├── api.ts           # Mounts Google API routes
    ├── health.ts        # Health check coordinator (/health/run)
    ├── frontend.ts      # Serves /ui-dashboard static assets
    └── scheduled.ts     # Handles cron trigger
```

---

#### `/packages/worker-health-agent`

**AI Log Analysis Worker**

```bash
worker-health-agent/
├── wrangler.toml
├── package.json
├── tsconfig.json
│
└── /src
    ├── index.ts         # Entry point (Cloudflare Agent SDK)
    ├── agent.ts         # Defines persona, tools, logic
    └── tools.ts         # D1 tool (get_logs_from_report)
```

---

## ⚙️ Implementation Notes

### 🔐 A2A (App-to-App) Design

* `worker-main` exclusively holds **Google Auth tokens**.
* Other workers (like `worker-health-agent`) interact with `worker-main` through authenticated **service-to-service (A2A)** calls, secured via Cloudflare Access or signed JWTs.

### 🪵 Logging

* Each SDK’s `request.ts` handles **verbose structured logging**.
* Health check runners aggregate and store logs for AI analysis.

### 🧠 Health Checks

* Each `<service>-health.ts` exports:

  ```ts
  export async function runDriveHealthChecks(apiClient): Promise<{
    results: Array<{ testName: string; success: boolean; error: string | null }>;
    logs: string[];
  }> { ... }
  ```

* Performs real integration tests (e.g., create, list, delete file).

### 🗄️ D1 Database

Migration file `0001_create_health_reports.sql` defines:

* `health_reports` (id, timestamp, status)
* `health_logs` (report_id, service, logs_json, results_json)
* `ai_analysis` (report_id, human_summary, dev_agent_prompt, overall_fix_prompt)

---

## 🔍 Module-by-Module Breakdown

### 1. **Package: Drive (and other SDKs)**

**File:** `/src/health-checks/drive-health.ts`
**Purpose:** Run live integration tests on Google Drive API
**Logic:**
Performs a series of real operations via `DriveClient`, capturing logs and structured test results.

---

### 2. **Package: db-schema**

**File:** `/migrations/0001_create_health_reports.sql`
**Purpose:** Define D1 schema for storing reports, logs, and analysis.

---

### 3. **Package: ui-dashboard**

**Files:** `index.html`, `main.js`
**Purpose:** Simple frontend for manual health runs.
**Logic:**

* Button triggers POST to `/health/run`.
* Displays results and optionally lists historical reports.

---

### 4. **Package: worker-main**

#### `wrangler.toml`

**Bindings:**

* `DB` → D1 Database
* `HEALTH_AGENT` → AI Agent Worker
* `GOOGLE_AUTH_SECRET` → Service auth secret

**Triggers:**

```toml
[triggers]
crons = ["0 4 * * *"]  # daily at 4AM
```

**Static Assets:** Serves `packages/ui-dashboard`

#### `src/index.ts`

Sets up the **Hono router**, imports API, health, and frontend routes, and exports both `fetch` and `scheduled` handlers.

#### `src/api.ts`

Mounts all SDK routes (Drive, Docs, Sheets, Apps Script) as authenticated endpoints.

Example:

```ts
api.get('/drive/files/list', async (c) => {
  const client = getDriveClient(c.env);
  return c.json(await client.files.listFiles());
});
```

#### `src/health.ts`

Coordinates full system health checks:

1. Insert new report (`RUNNING`)
2. Run tests across SDKs
3. Save logs and results
4. Update report → `ANALYZING`
5. Trigger `HEALTH_AGENT`
6. Return `{ reportId }` to client

#### `src/scheduled.ts`

Cron handler that reuses the `/health/run` logic.

---

### 5. **Package: worker-health-agent**

#### `wrangler.toml`

**Bindings:**

* `DB`: Cloudflare D1 (read-only recommended)
* `AI`: Workers AI model (`@cf/openai/gpt-oss-120b`)

#### `src/index.ts`

Handles incoming requests from `worker-main`, invokes the AI agent with the given `reportId`, and saves the output to D1.

#### `src/agent.ts`

**Persona:**

> “You are a specialized Google Workspace and Cloudflare Architect.
> Analyze health check logs, identify issues, and produce structured fix prompts.”

**Expected JSON Output:**

```json
{
  "human_summary": "Markdown-formatted operator summary",
  "dev_agent_prompt": "Prompt for AI developer agent to fix a single issue",
  "overall_fix_prompt": "Comprehensive prompt for fixing all issues"
}
```

#### `src/tools.ts`

Defines reusable tools (e.g., `get_logs_from_report(reportId)`) to query D1 for all logs and return JSON data to the AI agent.

---

## ✅ Summary

* **`worker-main`**: orchestrates tests, runs health checks, triggers AI analysis.
* **`worker-health-agent`**: performs AI-driven log analysis and generates fix prompts.
* **D1 Database**: central store for reports, logs, and AI results.
* **UI Dashboard**: lightweight HTML/JS frontend for triggering and viewing checks.
* **SDKs (Drive/Docs/Sheets/AppsScript)**: modular Google API interfaces with health test coverage.

---
