/**
 * Microsoft Graph wrapper — client-credentials flow, single-mailbox send.
 *
 * Uses the application-permission path (`Mail.Send` + `Mail.ReadBasic`)
 * so we don't need a signed-in user session. Access-policy must be
 * configured tenant-side to restrict the registered app to one mailbox
 * (see checklist in the admin README).
 *
 * Env:
 *   M365_TENANT_ID      — Entra tenant (e.g. "xxxxxxxx-xxxx-...")
 *   M365_CLIENT_ID      — app registration client ID
 *   M365_CLIENT_SECRET  — app registration client secret
 *   M365_SENDER_EMAIL   — mailbox to send from (daniel@agenticconsciousness.com.au)
 */

const TOKEN_URL = (tenant: string) => `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const GRAPH = 'https://graph.microsoft.com/v1.0';

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

export interface SendMailArgs {
  to: string;
  subject: string;
  html: string;
  pdf?: { filename: string; base64: string };
  // If set, Graph threads the send as a reply to this message id (touch #2+).
  replyToMessageId?: string;
}

export interface SendMailResult {
  messageId: string;
  conversationId: string;
}

/**
 * Sends via /users/{sender}/sendMail (new message) OR
 * /users/{sender}/messages/{id}/reply (threaded follow-up).
 */
export async function sendGraphMail(args: SendMailArgs): Promise<SendMailResult> {
  const c = cfg();
  const token = await getToken();

  const message = {
    subject: args.subject,
    body: { contentType: 'HTML', content: args.html },
    toRecipients: [{ emailAddress: { address: args.to } }],
    from: { emailAddress: { address: c.sender } },
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

  if (args.replyToMessageId) {
    // Thread as a reply. Graph's /reply endpoint takes {message,comment}
    // and sends in one call — preserves In-Reply-To / References.
    const url = `${GRAPH}/users/${encodeURIComponent(c.sender)}/messages/${encodeURIComponent(args.replyToMessageId)}/reply`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Graph reply failed: ${res.status} ${text.slice(0, 400)}`);
    }
    // /reply doesn't return the new message; look up the latest message
    // in the conversation for our records.
    return await lookupLastSentInThread(token, c.sender, args.replyToMessageId);
  }

  // New thread. Use /sendMail (no draft). We still want the created
  // message id + conversationId, so we create a draft + send instead.
  const createUrl = `${GRAPH}/users/${encodeURIComponent(c.sender)}/messages`;
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
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
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!sendRes.ok) {
    const text = await sendRes.text().catch(() => '');
    throw new Error(`Graph send failed: ${sendRes.status} ${text.slice(0, 400)}`);
  }
  return { messageId: draft.id, conversationId: draft.conversationId };
}

async function lookupLastSentInThread(token: string, sender: string, anchorMessageId: string): Promise<SendMailResult> {
  // Fetch the anchor message to get its conversationId, then return the
  // most recent sent message in that thread (which is the one we just
  // sent via /reply).
  const anchorRes = await fetch(
    `${GRAPH}/users/${encodeURIComponent(sender)}/messages/${encodeURIComponent(anchorMessageId)}?$select=conversationId`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!anchorRes.ok) throw new Error('Could not look up conversationId after reply');
  const anchor = (await anchorRes.json()) as { conversationId: string };

  const listRes = await fetch(
    `${GRAPH}/users/${encodeURIComponent(sender)}/mailFolders/SentItems/messages?$filter=conversationId eq '${anchor.conversationId}'&$orderby=sentDateTime desc&$top=1&$select=id,conversationId`,
    { headers: { Authorization: `Bearer ${token}` } },
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
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return false;
  const data = (await res.json()) as { value: Array<{ from?: { emailAddress?: { address?: string } }; isDraft?: boolean }> };
  return data.value.some((m) => {
    if (m.isDraft) return false;
    const addr = (m.from?.emailAddress?.address ?? '').toLowerCase();
    return addr && addr !== senderLower;
  });
}
