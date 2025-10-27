import { Hono } from 'hono';
import { runDriveHealthChecks } from '@workspace-api-modules/drive/src/health-checks/drive-health';
import { DriveClient } from '@workspace-api-modules/drive/src/client/DriveClient';

export const health = new Hono<{ Bindings: { DB: D1Database, HEALTH_AGENT: Fetcher } }>();

health.post('/run', async (c) => {
  const db = c.env.DB;
  const client = new DriveClient(c.env);
  const reportId = crypto.randomUUID();

  try {
    // 1. Create a new health report
    await db.prepare('INSERT INTO health_reports (id, status) VALUES (?, ?)')
      .bind(reportId, 'RUNNING')
      .run();

    // 2. Run the health checks
    const { results, logs } = await runDriveHealthChecks(client);

    // 3. Save the results and logs
    const runId = crypto.randomUUID();
    const runStatus = results.every(r => r.success) ? 'SUCCESS' : 'FAILURE';

    await db.prepare('INSERT INTO health_runs (id, report_id, service_name, status) VALUES (?, ?, ?, ?)')
      .bind(runId, reportId, 'drive', runStatus)
      .run();

    await db.prepare('INSERT INTO health_logs (id, run_id, logs_json) VALUES (?, ?, ?)')
      .bind(crypto.randomUUID(), runId, JSON.stringify(logs))
      .run();

    // 4. Update the report status to ANALYZING
    await db.prepare('UPDATE health_reports SET status = ? WHERE id = ?')
      .bind('ANALYZING', reportId)
      .run();

    // 5. Trigger the health agent
    await c.env.HEALTH_AGENT.fetch(new Request('https://agent.workers.dev', {
      method: 'POST',
      body: JSON.stringify({ reportId }),
      headers: { 'Content-Type': 'application/json' }
    }));

    return c.json({ message: 'Health check started', reportId });

  } catch (error: any) {
    console.error('Health check failed:', error.message);
    // Attempt to update the report status to ERROR
    await db.prepare('UPDATE health_reports SET status = ? WHERE id = ?')
      .bind('ERROR', reportId)
      .run();
    return c.json({ message: 'Health check failed to start', error: error.message }, 500);
  }
});
