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
    console.error('Email send failed:', error);
    return false;
  }
}

export async function notifyAdmin(subject: string, body: string): Promise<void> {
  await sendEmail({
    to: 'ai@agenticconsciousness.com.au',
    subject,
    html: `<pre style="font-family:monospace;font-size:14px;line-height:1.6">${body}</pre>`,
  });
}

// Brutalist email template
export function emailTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:40px 20px;background:#0a0a0a;color:#e0e0e0;font-family:'Helvetica Neue',Arial,sans-serif;line-height:1.7">
  <div style="max-width:560px;margin:0 auto">
    <div style="border-bottom:2px solid #ff3d00;padding-bottom:16px;margin-bottom:24px">
      <strong style="color:#fff;font-size:18px;letter-spacing:-1px">AC</strong><span style="color:#ff3d00;font-size:18px;font-weight:900">_</span>
    </div>
    ${content}
    <div style="border-top:2px solid #ff3d00;margin-top:32px;padding-top:16px;font-size:12px;color:#666">
      <strong style="color:#fff">Agentic Consciousness</strong><br>
      ai@agenticconsciousness.com.au<br>
      Australia
    </div>
  </div>
</body>
</html>`;
}
