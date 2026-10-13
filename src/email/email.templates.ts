const BRAND = '#4f46e5';
const INK = '#0f172a';
const MUTED = '#64748b';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type LayoutInput = {
  preheader: string;
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footnote?: string;
};

// Table layout and inline styles only: most email clients ignore <style> blocks and flexbox.
function renderLayout(input: LayoutInput): string {
  const cta = input.cta
    ? `
              <tr>
                <td style="padding:8px 0 28px;">
                  <a href="${escapeHtml(input.cta.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:10px;">${escapeHtml(input.cta.label)}</a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 24px;font-size:13px;line-height:20px;color:${MUTED};">
                  Button not working? Paste this link into your browser:<br>
                  <a href="${escapeHtml(input.cta.url)}" style="color:${BRAND};word-break:break-all;">${escapeHtml(input.cta.url)}</a>
                </td>
              </tr>`
    : '';

  const footnote = input.footnote
    ? `
              <tr>
                <td style="padding:20px 0 0;border-top:1px solid #e2e8f0;font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(input.footnote)}</td>
              </tr>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(input.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            <tr>
              <td style="padding:0 4px 16px;font-size:20px;font-weight:700;color:${INK};">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${BRAND};margin-right:8px;"></span>JobTrackr
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border-radius:16px;padding:36px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:0 0 12px;font-size:24px;line-height:32px;font-weight:700;color:${INK};">${escapeHtml(input.heading)}</td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 24px;font-size:16px;line-height:26px;color:#334155;">${input.bodyHtml}</td>
                  </tr>${cta}${footnote}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 4px 0;font-size:12px;line-height:18px;color:${MUTED};text-align:center;">
                Discover, track, refine. Your job search in one place.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderPasswordResetEmail(input: {
  resetUrl: string;
  expiresInHours: number;
}) {
  const expiry =
    input.expiresInHours === 1 ? '1 hour' : `${input.expiresInHours} hours`;
  const footnote = `If you didn't request this, you can safely ignore this email. Your password won't change.`;

  return {
    subject: 'Reset your JobTrackr password',
    html: renderLayout({
      preheader: `Use this link within ${expiry} to choose a new password.`,
      heading: 'Reset your password',
      bodyHtml: `We got a request to reset the password for your JobTrackr account. Choose a new one with the button below. The link expires in ${expiry}.`,
      cta: { label: 'Choose a new password', url: input.resetUrl },
      footnote,
    }),
    text: [
      'We got a request to reset the password for your JobTrackr account.',
      '',
      `Choose a new password: ${input.resetUrl}`,
      '',
      `This link expires in ${expiry}.`,
      footnote,
    ].join('\n'),
  };
}

export function renderNotificationEmail(input: {
  subject: string;
  text: string;
}) {
  const bodyHtml = input.text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`)
    .join('');

  return {
    html: renderLayout({
      preheader: input.text.split('\n')[0] ?? input.subject,
      heading: input.subject,
      bodyHtml,
    }),
  };
}
