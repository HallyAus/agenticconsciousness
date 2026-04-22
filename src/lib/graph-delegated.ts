/**
 * Microsoft Graph wrapper using DELEGATED auth (OAuth2 Authorization Code).
 *
 * Used as the primary path when app-only (client_credentials) is blocked by
 * tenant RAOP policy. Tokens belong to a signed-in user (the admin who
 * clicked Connect at /admin/connect). Because the user has delegate access
 * to the Agentic shared mailbox, the delegated token can read + write
 * drafts there without RAOP restrictions.
 *
 * Persistence: a singleton row in m365_auth (id = 1). Refresh tokens are
 * long-lived (~90 days); we refresh access tokens automatically when they
 * have less than 5 minutes left.
 *
 * Env:
 *   M365_TENANT_ID      — same as app-only
 *   M365_CLIENT_ID      — same as app-only (one app registration, two flows)
 *   M365_CLIENT_SECRET  — same as app-only
 *   SITE_URL            — base URL for the redirect URI
 */

import { sql } from '@/lib/pg';

const TOKEN_URL = (tenant: string) => `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const GRAPH = 'https://graph.microsoft.com/v1.0';
const UA = 'AgenticConsciousness-Outreach/1.0 (+https://agenticconsciousness.com.au)';

export const DELEGATED_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'User.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'Mail.ReadWrite.Shared',
  'Mail.Send.Shared',
];

interface AuthRow {
  user_email: string;
  user_id: string | null;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  scope: string | null;
}

/** Build the authorize URL for the sign-in redirect. */
export function getAuthorizeUrl(args: { state: string; redirectUri: string }): string {
  const tenant = process.env.M365_TENANT_ID ?? '';
  const clientId = process.env.M365_CLIENT_ID ?? '';
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: args.redirectUri,
    response_mode: 'query',
    scope: DELEGATED_SCOPES.join(' '),
    state: args.state,
    prompt: 'select_account',
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

/** Exchange authorization code for access + refresh tokens. */
export async function exchangeCodeForTokens(args: { code: string; redirectUri: string }): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}> {
  const tenant = process.env.M365_TENANT_ID ?? '';
  const clientId = process.env.M365_CLIENT_ID ?? '';
  const clientSecret = process.env.M365_CLIENT_SECRET ?? '';

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: args.code,
    redirect_uri: args.redirectUri,
    scope: DELEGATED_SCOPES.join(' '),
  });

  const r = await fetch(TOKEN_URL(tenant), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: body.toString(),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Token exchange failed: ${r.status} ${text.slice(0, 500)}`);
  }
  const data = (await r.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };
  if (!data.refresh_token) {
    throw new Error('No refresh_token returned — ensure offline_access scope is granted');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/** Fetch /me and persist identity alongside the tokens. */
export async function fetchMe(accessToken: string): Promise<{ id: string; userPrincipalName: string; mail: string | null }> {
  const r = await fetch(`${GRAPH}/me?$select=id,userPrincipalName,mail`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': UA },
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Graph /me failed: ${r.status} ${text.slice(0, 400)}`);
  }
  return (await r.json()) as { id: string; userPrincipalName: string; mail: string | null };
}

/** Persist the auth state (upserts the singleton row). */
export async function storeAuth(args: {
  userEmail: string;
  userId: string;
  refreshToken: string;
  accessToken: string;
  expiresIn: number;
  scope: string;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + args.expiresIn * 1000).toISOString();
  await sql`
    INSERT INTO m365_auth (
      id, user_email, user_id, refresh_token, access_token,
      access_token_expires_at, scope, connected_at, last_refreshed_at, updated_at
    )
    VALUES (
      1, ${args.userEmail}, ${args.userId}, ${args.refreshToken}, ${args.accessToken},
      ${expiresAt}, ${args.scope}, NOW(), NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      user_email = EXCLUDED.user_email,
      user_id = EXCLUDED.user_id,
      refresh_token = EXCLUDED.refresh_token,
      access_token = EXCLUDED.access_token,
      access_token_expires_at = EXCLUDED.access_token_expires_at,
      scope = EXCLUDED.scope,
      last_refreshed_at = NOW(),
      updated_at = NOW()
  `;
}

/** Loads the singleton row. Null if never connected. */
export async function getStoredAuth(): Promise<AuthRow | null> {
  const rows = (await sql`
    SELECT user_email, user_id, refresh_token, access_token, access_token_expires_at, scope
    FROM m365_auth WHERE id = 1
  `) as AuthRow[];
  return rows[0] ?? null;
}

/** Refresh the access token using the stored refresh token. */
async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}> {
  const tenant = process.env.M365_TENANT_ID ?? '';
  const clientId = process.env.M365_CLIENT_ID ?? '';
  const clientSecret = process.env.M365_CLIENT_SECRET ?? '';

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: DELEGATED_SCOPES.join(' '),
  });
  const r = await fetch(TOKEN_URL(tenant), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: body.toString(),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Token refresh failed: ${r.status} ${text.slice(0, 500)}`);
  }
  const data = (await r.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

/** Get a fresh access token, refreshing if within 5 min of expiry. Returns null if not connected. */
export async function getDelegatedAccessToken(): Promise<string | null> {
  const row = await getStoredAuth();
  if (!row) return null;

  const now = Date.now();
  const expMs = row.access_token_expires_at ? new Date(row.access_token_expires_at).getTime() : 0;
  if (row.access_token && expMs - now > 5 * 60_000) {
    return row.access_token;
  }

  const refreshed = await refreshAccessToken(row.refresh_token);
  await storeAuth({
    userEmail: row.user_email,
    userId: row.user_id ?? '',
    refreshToken: refreshed.refreshToken,
    accessToken: refreshed.accessToken,
    expiresIn: refreshed.expiresIn,
    scope: refreshed.scope,
  });
  return refreshed.accessToken;
}

export interface DelegatedDraftArgs {
  mailboxUpnOrId: string;
  to: string;
  subject: string;
  html: string;
  pdf?: { filename: string; base64: string };
}

export interface DelegatedDraftResult {
  messageId: string;
  conversationId: string;
  webLink: string;
}

/**
 * Create a draft in the target mailbox using the signed-in user's
 * delegated token. When the target mailbox is a shared mailbox to which
 * the user has FullAccess or SendAs, Graph creates the draft in the
 * shared mailbox's Drafts folder.
 */
export async function createDelegatedDraft(args: DelegatedDraftArgs): Promise<DelegatedDraftResult> {
  const token = await getDelegatedAccessToken();
  if (!token) throw new Error('M365 not connected. Sign in at /admin/connect first.');

  const message = {
    subject: args.subject,
    body: { contentType: 'html', content: args.html },
    toRecipients: [{ emailAddress: { address: args.to } }],
    // Delegated flow: signed-in user is daniel@printforge.com.au, but the
    // draft lives in the Agentic shared mailbox. Setting `from` here tells
    // Outlook to display and send as the shared mailbox (requires SendAs
    // permission on the mailbox, which comes with FullAccess delegate
    // assignment). Without this, Outlook defaults From to the signed-in
    // user and prospects see email from @printforge.com.au.
    from: { emailAddress: { address: args.mailboxUpnOrId } },
    sender: { emailAddress: { address: args.mailboxUpnOrId } },
    attachments: args.pdf
      ? [
          {
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: args.pdf.filename,
            contentType: 'application/pdf',
            contentBytes: args.pdf.base64,
          },
        ]
      : [],
  };

  const url = `${GRAPH}/users/${encodeURIComponent(args.mailboxUpnOrId)}/messages`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify(message),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`Delegated draft create failed: ${r.status} ${text.slice(0, 500)}`);
  }
  const draft = (await r.json()) as { id: string; conversationId: string; webLink: string };
  return {
    messageId: draft.id,
    conversationId: draft.conversationId,
    webLink: draft.webLink,
  };
}

export async function isDelegatedConnected(): Promise<boolean> {
  const row = await getStoredAuth();
  return !!row;
}

/**
 * Check whether the shared mailbox has any inbound messages in a
 * given conversationId (i.e. a reply from the prospect) since the
 * provided ISO timestamp.
 *
 * Uses the delegated token so it respects RAOP.
 */
export async function delegatedHasReplyInThread(args: {
  mailboxUpnOrId: string;
  conversationId: string;
  sinceIso: string;
  senderEmail: string;
}): Promise<boolean> {
  const token = await getDelegatedAccessToken();
  if (!token) throw new Error('M365 not connected');
  const filter = `conversationId eq '${args.conversationId}' and receivedDateTime ge ${args.sinceIso}`;
  const url = `${GRAPH}/users/${encodeURIComponent(args.mailboxUpnOrId)}/messages?$filter=${encodeURIComponent(filter)}&$top=20&$select=from,receivedDateTime,isDraft`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA } });
  if (!r.ok) return false;
  const data = (await r.json()) as { value: Array<{ from?: { emailAddress?: { address?: string } }; isDraft?: boolean }> };
  const senderLower = args.senderEmail.toLowerCase();
  return data.value.some((m) => {
    if (m.isDraft) return false;
    const addr = (m.from?.emailAddress?.address ?? '').toLowerCase();
    return addr && addr !== senderLower;
  });
}
