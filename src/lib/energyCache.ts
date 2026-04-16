import { sql } from './pg';

export async function getCachedPlans(retailerCode: string): Promise<unknown[] | null> {
  const rows = (await sql`
    SELECT plan_data FROM energy_plans_cache
    WHERE retailer_code = ${retailerCode}
      AND fetched_at > NOW() - INTERVAL '24 hours'
  `) as { plan_data: unknown[] }[];
  return rows[0]?.plan_data ?? null;
}

export async function setCachedPlans(retailerCode: string, plans: unknown[]): Promise<void> {
  await sql`
    INSERT INTO energy_plans_cache (retailer_code, plan_data, fetched_at)
    VALUES (${retailerCode}, ${JSON.stringify(plans)}::jsonb, NOW())
    ON CONFLICT (retailer_code) DO UPDATE SET
      plan_data = EXCLUDED.plan_data,
      fetched_at = NOW()
  `;
}

export async function getCachedEndpoints(): Promise<unknown | null> {
  const rows = (await sql`
    SELECT data FROM energy_endpoints_cache
    WHERE id = 1 AND fetched_at > NOW() - INTERVAL '24 hours'
  `) as { data: unknown }[];
  return rows[0]?.data ?? null;
}

export async function setCachedEndpoints(data: unknown): Promise<void> {
  await sql`
    INSERT INTO energy_endpoints_cache (id, data, fetched_at)
    VALUES (1, ${JSON.stringify(data)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      data = EXCLUDED.data,
      fetched_at = NOW()
  `;
}
