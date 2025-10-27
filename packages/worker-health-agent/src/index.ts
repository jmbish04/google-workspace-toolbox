import { Hono } from 'hono';
import { agent } from './agent';

const app = new Hono<{ Bindings: { DB: D1Database, AI: any } }>();

app.post('/', async (c) => {
  const db = c.env.DB;
  const { reportId } = await c.req.json();

  try {
    const { response } = await agent.run(`Analyze logs for report ${reportId}`, { db });
    const analysis = JSON.parse(response);

    await db.prepare('INSERT INTO ai_analysis (id, report_id, human_summary, dev_agent_prompt, overall_fix_prompt) VALUES (?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), reportId, analysis.human_summary, analysis.dev_agent_prompt, analysis.overall_fix_prompt)
      .run();

    await db.prepare('UPDATE health_reports SET status = ? WHERE id = ?')
      .bind('COMPLETE', reportId)
      .run();

    return c.text('Analysis complete');

  } catch (error: any) {
    console.error('AI analysis failed:', error.message);
    // Attempt to update the report status to ERROR
    await db.prepare('UPDATE health_reports SET status = ? WHERE id = ?')
      .bind('ERROR', reportId)
      .run();
    return c.text('Analysis failed', 500);
  }
});

export default app;
