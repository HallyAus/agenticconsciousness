import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'data', 'tool-stats.json');
const DEFAULT_STATS = {
  invoices: 1247,
  quotes: 892,
  competitors: 634,
  emails: 456,
  summaries: 312,
  meetings: 278,
  jobads: 189,
  contracts: 234,
};

export function getToolStats(): Record<string, number> {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
    }
  } catch {}
  return { ...DEFAULT_STATS };
}

export function incrementToolStat(
  tool: 'invoices' | 'quotes' | 'competitors' | 'emails' | 'summaries' | 'meetings' | 'jobads' | 'contracts'
) {
  const stats = getToolStats();
  stats[tool] = (stats[tool] || 0) + 1;
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
}
