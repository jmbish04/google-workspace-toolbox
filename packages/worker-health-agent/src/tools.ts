export const get_logs_from_report = async ({ reportId, db }: { reportId: string, db: D1Database }) => {
  const runsResult = await db.prepare('SELECT * FROM health_runs WHERE report_id = ?')
    .bind(reportId)
    .all();

  const runs = runsResult.results;

  if (!runs || runs.length === 0) {
    return JSON.stringify({ runs: [], logs: [] });
  }

  const runIds = runs.map((r: any) => r.id);
  const placeholders = runIds.map(() => '?').join(',');

  const logsResult = await db.prepare(`SELECT * FROM health_logs WHERE run_id IN (${placeholders})`)
    .bind(...runIds)
    .all();

  return JSON.stringify({ runs, logs: logsResult.results });
};
