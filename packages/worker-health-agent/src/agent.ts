import { Agent } from '@cloudflare/agents';
import { get_logs_from_report } from './tools';

const persona = `
You are a specialized Google Workspace system health analyst.
Analyze test logs and produce a structured JSON summary including:
1. human_summary
2. dev_agent_prompt
3. overall_fix_prompt
`;

export const agent = new Agent({
  tools: [get_logs_from_report],
  persona: persona,
});
