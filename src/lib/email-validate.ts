/**
 * Email deliverability pre-flight. Wraps the Abstract API email-validation
 * endpoint (https://www.abstractapi.com/api/email-verification-validation-api).
 *
 * If ABSTRACT_API_KEY is not set, we skip validation (returns `unknown`
 * verdict) so dev + first-boot don't require a paid key. In production,
 * set ABSTRACT_API_KEY to block bounces before they hit sender reputation.
 */

export type EmailVerdict = 'deliverable' | 'risky' | 'undeliverable' | 'unknown';

export interface EmailValidation {
  email: string;
  verdict: EmailVerdict;
  quality_score?: number;
  is_disposable?: boolean;
  is_free?: boolean;
  is_catchall?: boolean;
  provider?: string;
  raw?: unknown;
}

export async function validateEmail(email: string): Promise<EmailValidation> {
  const key = process.env.ABSTRACT_API_KEY;
  if (!key) {
    return { email, verdict: 'unknown' };
  }
  try {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${encodeURIComponent(key)}&email=${encodeURIComponent(email)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      return { email, verdict: 'unknown', raw: { status: r.status } };
    }
    const data = (await r.json()) as {
      deliverability?: string;
      quality_score?: string | number;
      is_disposable_email?: { value?: boolean };
      is_free_email?: { value?: boolean };
      is_catchall_email?: { value?: boolean };
      is_mx_found?: { value?: boolean };
      is_smtp_valid?: { value?: boolean };
    };

    const deliverability = (data.deliverability ?? '').toLowerCase();
    let verdict: EmailVerdict = 'unknown';
    if (deliverability === 'deliverable') verdict = 'deliverable';
    else if (deliverability === 'risky') verdict = 'risky';
    else if (deliverability === 'undeliverable') verdict = 'undeliverable';

    // Force undeliverable if MX or SMTP failed, regardless of deliverability label.
    if (data.is_mx_found?.value === false || data.is_smtp_valid?.value === false) {
      verdict = 'undeliverable';
    }

    return {
      email,
      verdict,
      quality_score: typeof data.quality_score === 'string' ? parseFloat(data.quality_score) : data.quality_score,
      is_disposable: data.is_disposable_email?.value,
      is_free: data.is_free_email?.value,
      is_catchall: data.is_catchall_email?.value,
      raw: data,
    };
  } catch (err) {
    console.error('[email-validate] failed', err instanceof Error ? err.message : err);
    return { email, verdict: 'unknown' };
  }
}

export function isBlockingVerdict(v: EmailVerdict): boolean {
  return v === 'undeliverable';
}
