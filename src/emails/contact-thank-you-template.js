const BRAND = {
  primary: '#0569ff',
  secondary: '#10B981',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  surface: '#F8FAFC',
  warm: '#FFF7ED',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildContactThankYouTemplate({
  name,
  schoolName,
  role,
  demoPreferred,
  origin,
}) {
  const safeName = escapeHtml(name || 'there');
  const safeSchoolName = escapeHtml(schoolName || 'your school');
  const safeRole = role ? escapeHtml(role) : 'your team';
  const safeDemoPreferred = demoPreferred
    ? escapeHtml(demoPreferred)
    : 'your preferred time';
  const logoUrl = `${origin}/edu.png`;

  return {
    subject: 'Thanks for contacting EduBreezy',
    text: [
      `Hi ${safeName},`,
      '',
      'Thank you for contacting EduBreezy.',
      `We received your request for ${safeSchoolName} and our team will connect with you shortly.`,
      '',
      `Role: ${safeRole}`,
      `Preferred demo time: ${safeDemoPreferred}`,
      '',
      'Need anything urgent? Reply to this email or call +91 94705 56016.',
      '',
      'Team EduBreezy',
    ].join('\n'),
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Thanks for contacting EduBreezy</title>
        </head>
        <body style="margin:0;padding:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#eef4ff 0%,#ffffff 100%);padding:32px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid ${BRAND.border};border-radius:28px;overflow:hidden;">
                  <tr>
                    <td style="padding:28px 32px;background:linear-gradient(135deg,${BRAND.primary} 0%,#0a4fcf 100%);">
                      <table role="presentation" width="100%">
                        <tr>
                          <td style="vertical-align:middle;">
                            <img src="${logoUrl}" alt="EduBreezy" width="170" style="display:block;max-width:170px;height:auto;" />
                          </td>
                          <td align="right" style="vertical-align:middle;">
                            <span style="display:inline-block;padding:10px 16px;border-radius:999px;background:rgba(255,255,255,0.14);color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                              Contact Request Received
                            </span>
                          </td>
                        </tr>
                      </table>
                      <div style="padding-top:28px;color:#ffffff;">
                        <div style="font-size:14px;opacity:0.92;margin-bottom:10px;">Hi ${safeName},</div>
                        <h1 style="margin:0;font-size:34px;line-height:1.15;font-weight:800;">Thank you for contacting us.</h1>
                        <p style="margin:14px 0 0;font-size:16px;line-height:1.7;max-width:470px;opacity:0.94;">
                          We received your EduBreezy request for ${safeSchoolName}. Our team will connect with you shortly and help you with the next steps.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:20px;">
                        <tr>
                          <td style="padding:24px;">
                            <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND.primary};margin-bottom:14px;">
                              Request Snapshot
                            </div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.muted};">School</td>
                                <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;font-weight:700;color:${BRAND.text};">${safeSchoolName}</td>
                              </tr>
                              <tr>
                                <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.muted};">Role</td>
                                <td align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;font-weight:700;color:${BRAND.text};">${safeRole}</td>
                              </tr>
                              <tr>
                                <td style="padding:10px 0;font-size:14px;color:${BRAND.muted};">Preferred demo time</td>
                                <td align="right" style="padding:10px 0;font-size:14px;font-weight:700;color:${BRAND.text};">${safeDemoPreferred}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;background:${BRAND.warm};border:1px solid #fed7aa;border-radius:18px;">
                        <tr>
                          <td style="padding:20px 22px;">
                            <div style="font-size:16px;font-weight:800;color:${BRAND.text};margin-bottom:8px;">
                              What happens next
                            </div>
                            <div style="font-size:14px;line-height:1.7;color:${BRAND.muted};">
                              Our team reviews your request, aligns the best demo flow for your school, and reaches out shortly by email or phone.
                            </div>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top:24px;font-size:14px;line-height:1.8;color:${BRAND.muted};">
                        If you need urgent help, reply to this email or call
                        <a href="tel:+919470556016" style="color:${BRAND.primary};font-weight:700;text-decoration:none;">+91 94705 56016</a>.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.border};background:#ffffff;">
                      <div style="font-size:13px;line-height:1.7;color:${BRAND.muted};">
                        Team EduBreezy<br />
                        Smart school management, thoughtfully built.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };
}

export function buildContactAdminNotificationTemplate(submission) {
  const fields = [
    ['Name', submission.name],
    ['Email', submission.email],
    ['Phone', submission.phone],
    ['School', submission.schoolName],
    ['Role', submission.role || 'Not provided'],
    ['Student Count', submission.studentCount || 'Not provided'],
    ['Preferred Demo Time', submission.demoPreferred || 'Not provided'],
    ['Message', submission.message || 'Not provided'],
  ];

  return {
    subject: `New contact enquiry from ${submission.name}`,
    text: fields.map(([label, value]) => `${label}: ${value}`).join('\n'),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;padding:24px;background:#f8fafc;color:#111827;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;">
          <div style="font-size:12px;font-weight:700;color:#0569ff;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px;">New Contact Submission</div>
          <h1 style="margin:0 0 16px;font-size:28px;">${escapeHtml(submission.name)}</h1>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${fields
              .map(
                ([label, value]) => `
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#6b7280;">${escapeHtml(label)}</td>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:700;text-align:right;color:#111827;">${escapeHtml(value)}</td>
                  </tr>
                `
              )
              .join('')}
          </table>
        </div>
      </div>
    `,
  };
}
