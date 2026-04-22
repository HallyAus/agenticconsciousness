/**
 * Auto-fallback draft helper.
 *
 * Prefers the delegated (user-signed-in) flow when a session is stored.
 * Tries app-only (client_credentials) first ONLY if the tenant has lifted
 * RAOP in the future — we don't want to make a futile call every time.
 *
 * Current policy (given RAOP blocks app-only in this tenant):
 *   1. If delegated session exists, use it.
 *   2. Else, try app-only. If it 403s with RAOP, surface a clear "connect
 *      M365 first" error.
 *   3. If M365_AUTH_MODE env forces a mode, honour that.
 *
 * Environment:
 *   M365_AUTH_MODE = 'delegated' | 'app' | 'auto' (default 'auto')
 */

import { createGraphDraft, isGraphConfigured, type CreateDraftResult } from '@/lib/graph';
import { createDelegatedDraft, isDelegatedConnected } from '@/lib/graph-delegated';

interface AutoDraftArgs {
  to: string;
  subject: string;
  html: string;
  pdf?: { filename: string; base64: string };
  mailboxUpnOrId?: string; // for delegated; defaults to M365_SENDER_EMAIL
}

export type AutoDraftResult = CreateDraftResult & { mode: 'app' | 'delegated' };

const SENDER = () => process.env.M365_SENDER_EMAIL ?? '';

export async function createDraftAuto(args: AutoDraftArgs): Promise<AutoDraftResult> {
  const mode = (process.env.M365_AUTH_MODE ?? 'auto').toLowerCase();
  const sender = args.mailboxUpnOrId || SENDER();
  if (!sender) throw new Error('Sender mailbox not configured (M365_SENDER_EMAIL)');

  const delegatedAvailable = await isDelegatedConnected();

  // Forced modes
  if (mode === 'delegated') {
    if (!delegatedAvailable) throw new Error('M365 not connected. Sign in at /api/admin/m365-connect first.');
    return {
      ...(await createDelegatedDraft({ mailboxUpnOrId: sender, ...args })),
      mode: 'delegated',
    };
  }
  if (mode === 'app') {
    if (!isGraphConfigured()) throw new Error('M365 app-only not configured.');
    return { ...(await createGraphDraft(args)), mode: 'app' };
  }

  // Auto: prefer delegated when available (sidesteps RAOP).
  if (delegatedAvailable) {
    try {
      return {
        ...(await createDelegatedDraft({ mailboxUpnOrId: sender, ...args })),
        mode: 'delegated',
      };
    } catch (err) {
      // If delegated fails (e.g. token revoked), surface a clear error.
      const msg = err instanceof Error ? err.message : 'delegated draft failed';
      throw new Error(`Delegated draft failed: ${msg}. Reconnect M365 at /admin.`);
    }
  }

  // No delegated session. Try app-only; surface a hint toward /admin/connect on RAOP.
  if (!isGraphConfigured()) {
    throw new Error('M365 not connected. Click "Connect Microsoft 365" in /admin.');
  }
  try {
    return { ...(await createGraphDraft(args)), mode: 'app' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'app-only draft failed';
    if (/RAOP|OData is disabled|AccessDenied/i.test(msg)) {
      throw new Error(
        'App-only Graph access is blocked by tenant RAOP policy. Click "Connect Microsoft 365" in /admin to sign in and use the delegated flow instead.',
      );
    }
    throw err;
  }
}
