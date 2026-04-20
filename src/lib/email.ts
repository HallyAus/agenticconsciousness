import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = 'Agentic Consciousness <ai@agenticconsciousness.com.au>';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions): Promise<boolean> {
  // Always log
  console.log(JSON.stringify({
    event: 'email_send',
    to,
    subject,
    hasResend: !!resend,
    timestamp: new Date().toISOString(),
  }));

  if (!resend) {
    console.warn('RESEND_API_KEY not set — email logged but not sent');
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      replyTo: replyTo || 'ai@agenticconsciousness.com.au',
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function notifyAdmin(subject: string, body: string): Promise<void> {
  await sendEmail({
    to: 'ai@agenticconsciousness.com.au',
    subject,
    html: `<pre style="font-family:monospace;font-size:14px;line-height:1.6;color:#222">${escapeHtml(body)}</pre>`,
  });
}

/**
 * Brutalist-branded email template with light/dark auto-adaptation.
 *
 * Defaults to LIGHT mode (white bg, dark text) because most mobile mail
 * clients are light-biased and dark-mode inverted emails often render
 * poorly without explicit support. Dark-mode-capable clients (Apple Mail,
 * Gmail, Outlook iOS, Spark) honour the `@media (prefers-color-scheme:
 * dark)` override below via the .ac-* class hooks.
 *
 * Brand red #ff3d00 works on both modes so buttons/borders stay
 * consistent. Body colours swap via class overrides.
 */
export function emailTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Agentic Consciousness</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { margin: 0; }
    .ac-logo-text { color: #0a0a0a; }
    .ac-heading { color: #0a0a0a; }
    .ac-body { color: #333333; }
    .ac-dim { color: #666666; }
    .ac-accent { color: #cc3100; }
    .ac-card { background: #fafafa; }
    .ac-card-dark { background: #ffffff; }
    .ac-page { background: #ffffff; color: #333333; }
    @media (prefers-color-scheme: dark) {
      .ac-page { background: #141311 !important; color: #e0e0de !important; }
      .ac-logo-text, .ac-heading { color: #fafaf8 !important; }
      .ac-body { color: #e0e0de !important; }
      .ac-dim { color: #999997 !important; }
      .ac-accent { color: #ff5722 !important; }
      .ac-card { background: #1c1a17 !important; }
      .ac-card-dark { background: #24221d !important; }
    }
  </style>
</head>
<body class="ac-page" style="margin:0;padding:40px 20px;background:#ffffff;color:#333333;font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.7">
  <div style="max-width:560px;margin:0 auto">
    <div style="border-bottom:2px solid #ff3d00;padding-bottom:16px;margin-bottom:24px">
      <strong class="ac-logo-text" style="color:#0a0a0a;font-size:18px;letter-spacing:-1px">AC</strong><span style="color:#ff3d00;font-size:18px;font-weight:900">_</span>
    </div>
    ${content}
    <div class="ac-dim" style="border-top:2px solid #ff3d00;margin-top:32px;padding-top:16px;font-size:12px;color:#666666">
      <strong class="ac-heading" style="color:#0a0a0a">Agentic Consciousness</strong><br>
      ai@agenticconsciousness.com.au<br>
      Australia
    </div>
  </div>
</body>
</html>`;
}
