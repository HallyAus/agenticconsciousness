import { NextRequest, NextResponse } from 'next/server';
import { isGraphConfigured } from '@/lib/graph';

/**
 * Admin-only Graph diagnostic.
 *
 * GET /api/admin/graph-diag                     — uses M365_SENDER_EMAIL (SMTP)
 * GET /api/admin/graph-diag?target=<something>  — override the mailbox identity
 *
 * Try both SMTP (daniel@agenticconsciousness.com.au) and UPN
 * (Daniel@NETORG17949051.onmicrosoft.com) to rule out address resolution
 * failures in the RBAC scope filter.
 */

interface Check {
  step: string;
  ok: boolean;
  status?: number;
  detail?: unknown;
}

export async function GET(req: NextRequest) {
  const checks: Check[] = [];
  const override = req.nextUrl.searchParams.get('target');

  // Step 0 — env
  const envCheck = {
    M365_TENANT_ID: Boolean(process.env.M365_TENANT_ID),
    M365_CLIENT_ID: Boolean(process.env.M365_CLIENT_ID),
    M365_CLIENT_SECRET: Boolean(process.env.M365_CLIENT_SECRET),
    M365_SENDER_EMAIL: process.env.M365_SENDER_EMAIL ?? '(not set)',
    targetOverride: override ?? null,
    isGraphConfigured: isGraphConfigured(),
  };
  checks.push({ step: 'env', ok: envCheck.isGraphConfigured, detail: envCheck });
  if (!envCheck.isGraphConfigured) return NextResponse.json({ checks }, { status: 503 });

  const tenant = process.env.M365_TENANT_ID!;
  const clientId = process.env.M365_CLIENT_ID!;
  const clientSecret = process.env.M365_CLIENT_SECRET!;
  const sender = override || process.env.M365_SENDER_EMAIL!;

  // Step 1 — token
  let token: string | null = null;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    });
    const r = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const text = await r.text();
    if (!r.ok) {
      checks.push({ step: 'token', ok: false, status: r.status, detail: text.slice(0, 500) });
      return NextResponse.json({ checks }, { status: 500 });
    }
    const j = JSON.parse(text) as { access_token: string; expires_in: number };
    token = j.access_token;
    checks.push({ step: 'token', ok: true, status: r.status, detail: { expiresInSec: j.expires_in } });
  } catch (err) {
    checks.push({ step: 'token', ok: false, detail: (err as Error).message });
    return NextResponse.json({ checks }, { status: 500 });
  }

  // Step 2 — GET /users/{sender} — basic mailbox visibility
  const UA = 'AgenticConsciousness-Outreach/1.0 (+https://agenticconsciousness.com.au)';
  const H = { Authorization: `Bearer ${token}`, 'User-Agent': UA };
  try {
    const r = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}?$select=id,displayName,mail,userPrincipalName`,
      { headers: H },
    );
    const text = await r.text();
    checks.push({
      step: 'GET /users/{sender}',
      ok: r.ok,
      status: r.status,
      detail: r.ok ? JSON.parse(text) : text.slice(0, 500),
    });
  } catch (err) {
    checks.push({ step: 'GET /users/{sender}', ok: false, detail: (err as Error).message });
  }

  // Step 3 — GET /users/{sender}/mailFolders/inbox — mailbox read
  try {
    const r = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/mailFolders/inbox?$select=id,displayName,totalItemCount`,
      { headers: H },
    );
    const text = await r.text();
    checks.push({
      step: 'GET /users/{sender}/mailFolders/inbox',
      ok: r.ok,
      status: r.status,
      detail: r.ok ? JSON.parse(text) : text.slice(0, 500),
    });
  } catch (err) {
    checks.push({ step: 'GET /mailFolders/inbox', ok: false, detail: (err as Error).message });
  }

  // Step 4 — POST /users/{sender}/messages — minimal draft create
  try {
    const r = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/messages`,
      {
        method: 'POST',
        headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: '[DIAG] graph-diag probe (safe to delete)',
          body: { contentType: 'Text', content: 'This is a diagnostic draft from /api/admin/graph-diag. Safe to delete.' },
          toRecipients: [{ emailAddress: { address: sender } }],
        }),
      },
    );
    const text = await r.text();
    checks.push({
      step: 'POST /users/{sender}/messages (create draft)',
      ok: r.ok,
      status: r.status,
      detail: r.ok ? { ok: true, id: JSON.parse(text).id } : text.slice(0, 800),
    });
  } catch (err) {
    checks.push({ step: 'POST /messages', ok: false, detail: (err as Error).message });
  }

  return NextResponse.json({ checks });
}
