import { sql } from './pg';

export type ToolName =
  | 'invoices'
  | 'quotes'
  | 'competitors'
  | 'emails'
  | 'summaries'
  | 'meetings'
  | 'jobads'
  | 'contracts'
  | 'energy';

const DEFAULT_STATS: Record<ToolName, number> = {
  invoices: 0,
  quotes: 0,
  competitors: 0,
  emails: 0,
  summaries: 0,
  meetings: 0,
  jobads: 0,
  contracts: 0,
  energy: 0,
};

export async function getToolStats(): Promise<Record<string, number>> {
  try {
    const rows = (await sql`SELECT tool, count FROM tool_stats`) as { tool: string; count: number }[];
    const out: Record<string, number> = { ...DEFAULT_STATS };
    for (const r of rows) out[r.tool] = r.count;
    return out;
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export async function incrementToolStat(tool: ToolName): Promise<void> {
  await sql`
    INSERT INTO tool_stats (tool, count) VALUES (${tool}, 1)
    ON CONFLICT (tool) DO UPDATE SET count = tool_stats.count + 1
  `;
}
