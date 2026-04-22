/**
 * Synchronous forensic breadcrumbs for the PDF render pipeline.
 *
 * Why this exists: @react-pdf/renderer sometimes SIGKILLs the native
 * fontkit/pdfkit process mid-render on Vercel Fluid Compute. When it
 * does, stdout never flushes — we only see one prior `console.log`
 * then silence then 500. That makes post-mortem impossible.
 *
 * This helper writes an AWAITED row to Neon at every pipeline step.
 * Neon's wire ACK returns before the next line of JS runs, so the
 * row survives SIGKILL. The last-surviving row == crash point.
 *
 * Table `pdf_render_breadcrumbs` was created ad-hoc (no migrations
 * framework in this project). Columns: request_id, prospect_id, step,
 * elapsed_ms, payload_bytes, payload_sha256, meta (jsonb), ok.
 *
 * Intentionally never throws upstream — a failed breadcrumb should
 * never break the caller's render. Swallows + console.error.
 */

import { randomUUID } from 'node:crypto';
import { sql } from '@/lib/pg';

export interface BreadcrumbTrail {
  requestId: string;
  prospectId: string;
  startedAt: number;
  log: (step: string, meta?: Record<string, unknown>) => Promise<void>;
  fail: (step: string, err: unknown, meta?: Record<string, unknown>) => Promise<void>;
}

export function startBreadcrumbTrail(prospectId: string): BreadcrumbTrail {
  const requestId = randomUUID();
  const startedAt = Date.now();

  const log = async (step: string, meta?: Record<string, unknown>) => {
    const elapsed = Date.now() - startedAt;
    try {
      const metaJson = meta ? JSON.stringify(meta) : null;
      await sql`
        INSERT INTO pdf_render_breadcrumbs
          (request_id, prospect_id, step, elapsed_ms, meta, ok)
        VALUES
          (${requestId}::uuid, ${prospectId}, ${step}, ${elapsed},
           ${metaJson}::jsonb, true)
      `;
    } catch (err) {
      console.error('[breadcrumb] write failed', {
        requestId, step,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const fail = async (step: string, err: unknown, meta?: Record<string, unknown>) => {
    const elapsed = Date.now() - startedAt;
    const errorName = err instanceof Error ? err.name : 'Unknown';
    const errorMessage = err instanceof Error ? err.message : String(err);
    const stackLines = err instanceof Error && err.stack
      ? err.stack.split('\n').slice(1, 31).map((s) => s.trim())
      : [];
    const fullMeta = {
      ...(meta ?? {}),
      error_name: errorName,
      error_message: errorMessage,
      stack_first_line: stackLines[0] ?? '',
      stack: stackLines,
    };
    try {
      await sql`
        INSERT INTO pdf_render_breadcrumbs
          (request_id, prospect_id, step, elapsed_ms, meta, ok)
        VALUES
          (${requestId}::uuid, ${prospectId}, ${step}, ${elapsed},
           ${JSON.stringify(fullMeta)}::jsonb, false)
      `;
    } catch (dbErr) {
      console.error('[breadcrumb] fail write failed', {
        requestId, step,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
    }
  };

  return { requestId, prospectId, startedAt, log, fail };
}

/**
 * Capture a shallow memory snapshot at a point of interest.
 * Used on the `render:about_to_call_renderToBuffer` breadcrumb so
 * we can tell OOM kills apart from layout NaN kills post-mortem.
 */
export function memorySnapshot(): Record<string, number> {
  const m = process.memoryUsage();
  return {
    heap_used_mb: Math.round(m.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(m.heapTotal / 1024 / 1024),
    rss_mb: Math.round(m.rss / 1024 / 1024),
    external_mb: Math.round(m.external / 1024 / 1024),
    array_buffers_mb: Math.round(m.arrayBuffers / 1024 / 1024),
  };
}
