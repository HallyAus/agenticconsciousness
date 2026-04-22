/**
 * Microsoft Graph wrapper — client-credentials flow, single-mailbox operations.
 *
 * We operate against a shared mailbox using application-permission scopes
 * (`Mail.Send` + `Mail.ReadWrite` + `Mail.ReadBasic`). An Exchange
 * ApplicationAccessPolicy restricts the app to one mailbox tenant-side.
 *
 * The primary flow is DRAFT-first: `createGraphDraft` writes a draft to the
 * sender's mailbox and returns a `webLink` that deep-links to the draft in
 * Outlook on the web. The human reviews and sends manually.
 *
 * `sendGraphMail` is retained for the (rare) fully-automated case.
 *
 * Env:
 *   M365_TENANT_ID      — Entra tenant (e.g. "xxxxxxxx-xxxx-...")
 *   M365_CLIENT_ID      — app registration client ID
 *   M365_CLIENT_SECRET  — app registration client secret
 *   M365_SENDER_EMAIL   — mailbox to operate against (e.g. daniel@agenticconsciousness.com.au)
 */

const TOKEN_URL = (tenant: string) => `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const GRAPH = 'https://graph.microsoft.com/v1.0';

/** Microsoft Graph rejects app-only calls with missing or minimal User-Agent
 *  in RAOP-enforcing tenants. Setting an explicit branded UA avoids that. */
const UA = 'AgenticConsciousness-Outreach/1.0 (+https://agenticconsciousness.com.au)';

interface TokenState { token: string; expiresAt: number }
let cachedToken: TokenState | null = null;

function cfg() {
  return {
    tenant: process.env.M365_TENANT_ID ?? '',
    clientId: process.env.M365_CLIENT_ID ?? '',
    clientSecret: process.env.M365_CLIENT_SECRET ?? '',
    sender: process.env.M365_SENDER_EMAIL ?? '',
  };
}

export function isGraphConfigured(): boolean {
  const c = cfg();
  return Boolean(c.tenant && c.clientId && c.clientSecret && c.sender);
}

async function getToken(): Promise<string> {
  const c = cfg();
  if (!isGraphConfigured()) throw new Error('M365_* env vars not set');
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.token;

  const params = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    grant_type: 'client_credentials',
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(TOKEN_URL(c.tenant), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Graph token fetch failed: ${res.status} ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

interface MessageInput {
  to: string;
  subject: string;
  html: string;
  pdf?: { filename: string; base64: string };
}

function buildMessagePayload(args: MessageInput, _sender: string) {
  // We intentionally omit `from`. When POSTing to /users/{sender}/messages
  // the sender is implicit from the URL; setting it explicitly can trigger
  // a SendAs permission check on some tenant configurations.
  return {
    subject: args.subject,
    body: { contentType: 'html', content: args.html },
    toRecipients: [{ emailAddress: { address: args.to } }],
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
}

export interface CreateDraftResult {
  messageId: string;
  conversationId: string;
  webLink: string;
}

/**
 * Creates a draft message in the sender's mailbox. Does NOT send.
 * Returns the draft id + a `webLink` that opens the draft in Outlook on the web.
 */
export async function createGraphDraft(args: MessageInput): Promise<CreateDraftResult> {
  const c = cfg();
  const token = await getToken();

  const url = `${GRAPH}/users/${encodeURIComponent(c.sender)}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify(buildMessagePayload(args, c.sender)),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Graph create draft failed: ${res.status} ${text.slice(0, 400)}`);
  }
  const draft = (await res.json()) as { id: string; conversationId: string; webLink: string };
  return { messageId: draft.id, conversationId: draft.conversationId, webLink: draft.webLink };
}

export interface SendMailArgs extends MessageInput {
  replyToMessageId?: string;
}

export interface SendMailResult {
  messageId: string;
  conversationId: string;
}

/**
 * Sends an email directly. Retained for edge cases where fully automated send
 * is desired (not the default path for prospect outreach).
 */
export async function sendGraphMail(args: SendMailArgs): Promise<SendMailResult> {
  const c = cfg();
  const token = await getToken();
  const message = buildMessagePayload(args, c.sender);

  if (args.replyToMessageId) {
    const url = `${GRAPH}/users/${encodeURIComponent(c.sender)}/messages/${encodeURIComponent(args.replyToMessageId)}/reply`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Graph reply failed: ${res.status} ${text.slice(0, 400)}`);
    }
    return await lookupLastSentInThread(token, c.sender, args.replyToMessageId);
  }

  const createUrl = `${GRAPH}/users/${encodeURIComponent(c.sender)}/messages`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify(message),
  });
  if (!createRes.ok) {
    const text = await createRes.text().catch(() => '');
    throw new Error(`Graph create draft failed: ${createRes.status} ${text.slice(0, 400)}`);
  }
  const draft = (await createRes.json()) as { id: string; conversationId: string };

  const sendUrl = `${GRAPH}/users/${encodeURIComponent(c.sender)}/messages/${encodeURIComponent(draft.id)}/send`;
  const sendRes = await fetch(sendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA },
  });
  if (!sendRes.ok) {
    const text = await sendRes.text().catch(() => '');
    throw new Error(`Graph send failed: ${sendRes.status} ${text.slice(0, 400)}`);
  }
  return { messageId: draft.id, conversationId: draft.conversationId };
}

async function lookupLastSentInThread(token: string, sender: string, anchorMessageId: string): Promise<SendMailResult> {
  const anchorRes = await fetch(
    `${GRAPH}/users/${encodeURIComponent(sender)}/messages/${encodeURIComponent(anchorMessageId)}?$select=conversationId`,
    { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA } },
  );
  if (!anchorRes.ok) throw new Error('Could not look up conversationId after reply');
  const anchor = (await anchorRes.json()) as { conversationId: string };

  const listRes = await fetch(
    `${GRAPH}/users/${encodeURIComponent(sender)}/mailFolders/SentItems/messages?$filter=conversationId eq '${anchor.conversationId}'&$orderby=sentDateTime desc&$top=1&$select=id,conversationId`,
    { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA } },
  );
  if (!listRes.ok) throw new Error('Could not list sent thread items');
  const list = (await listRes.json()) as { value: Array<{ id: string; conversationId: string }> };
  if (list.value.length === 0) throw new Error('Sent message not found in thread');
  return { messageId: list.value[0].id, conversationId: list.value[0].conversationId };
}

/** Returns true if the conversation has any inbound message from a
 *  sender other than our mailbox since the given timestamp. */
export async function hasReplyInThread(conversationId: string, sinceIso: string): Promise<boolean> {
  const c = cfg();
  const token = await getToken();
  const senderLower = c.sender.toLowerCase();
  const url = `${GRAPH}/users/${encodeURIComponent(c.sender)}/messages?$filter=conversationId eq '${conversationId}' and receivedDateTime ge ${sinceIso}&$top=20&$select=from,receivedDateTime,isDraft`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': UA } });
  if (!res.ok) return false;
  const data = (await res.json()) as { value: Array<{ from?: { emailAddress?: { address?: string } }; isDraft?: boolean }> };
  return data.value.some((m) => {
    if (m.isDraft) return false;
    const addr = (m.from?.emailAddress?.address ?? '').toLowerCase();
    return addr && addr !== senderLower;
  });
}
