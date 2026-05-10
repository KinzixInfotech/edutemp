const BRAND = {
  primary: '#0569ff',
  ink: '#0f172a',
  muted: '#64748b',
  soft: '#f8fafc',
  line: '#e2e8f0',
  success: '#10b981',
  navy: '#102a43',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

function buildDetailRows(rows) {
  return rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <tr>
          <td class="detail-label" style="padding:12px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;color:${BRAND.muted};">${escapeHtml(label)}</td>
          <td class="detail-value" align="right" style="padding:12px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;font-weight:700;color:${BRAND.ink};">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join('');
}

export function buildSchoolWelcomeTemplate({
  recipientName,
  recipientRole,
  schoolName,
  schoolEmail,
  schoolLogoUrl,
  schoolCode,
  schoolPhone,
  schoolLocation,
  schoolCity,
  schoolState,
  schoolCountry,
  directorName,
  principalName,
  loginUrl,
  schoolUrl,
  plan,
  includedCapacity,
  yearlyAmount,
  origin,
}) {
  const safeRecipientName = recipientName || 'there';
  const safeSchoolName = schoolName || 'your school';
  const safeDirectorName = directorName || 'School Director';
  const safeRole = recipientRole || 'School Team';
  const eduLogoUrl = `${origin}/email_asset/edubreezy_logo.png`;
  const logoUrl = normalizeUrl(schoolLogoUrl) || eduLogoUrl;
  const resolvedLoginUrl = normalizeUrl(loginUrl || origin);
  const resolvedSchoolUrl = normalizeUrl(schoolUrl);
  const subject = `Welcome to EduBreezy, ${safeSchoolName} is ready`;

  const detailRows = buildDetailRows([
    ['School', safeSchoolName],
    ['School code', schoolCode],
    ['Director', safeDirectorName],
    ['Principal', principalName],
    ['School email', schoolEmail],
    ['Phone', schoolPhone],
    ['Location', [schoolLocation, schoolCity, schoolState, schoolCountry].filter(Boolean).join(', ')],
    ['ERP plan', plan],
    ['Included student capacity', includedCapacity],
    ['Yearly billing', yearlyAmount],
    ['Workspace', resolvedSchoolUrl || resolvedLoginUrl],
  ]);

  const text = [
    `Hi ${safeRecipientName},`,
    '',
    `Welcome to EduBreezy. ${safeSchoolName} has been created successfully and your school workspace is ready.`,
    '',
    `Main director: ${safeDirectorName}`,
    principalName ? `Principal: ${principalName}` : null,
    schoolEmail ? `School email: ${schoolEmail}` : null,
    schoolPhone ? `Phone: ${schoolPhone}` : null,
    schoolCode ? `School code: ${schoolCode}` : null,
    plan ? `ERP plan: ${plan}` : null,
    includedCapacity ? `Included student capacity: ${includedCapacity}` : null,
    yearlyAmount ? `Yearly billing: ${yearlyAmount}` : null,
    '',
    `Sign in: ${resolvedLoginUrl}`,
    resolvedSchoolUrl ? `School website/workspace: ${resolvedSchoolUrl}` : null,
    '',
    'Recommended first steps:',
    '1. Sign in and review the school profile.',
    '2. Add classes, sections, teachers, students, and parents.',
    '3. Configure academic year, fees, attendance, documents, and communication settings.',
    '4. Invite your team and begin daily operations from the dashboard.',
    '',
    'Team EduBreezy',
    'hello@edubreezy.com',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject,
    text,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(subject)}</title>
          <style>
            @media only screen and (max-width: 600px) {
              .outer-wrap { padding: 12px 0 !important; padding-top:0px !important; }
              .email-shell { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border-left: 0 !important; border-right: 0 !important; }
              .hero-cell { padding: 24px 20px !important; }
              .brand-left, .brand-right, .hero-copy, .school-logo-cell, .footer-left, .footer-right { display: block !important; width: 100% !important; text-align: left !important; }
              .brand-right { padding-top: 16px !important; }
              .school-logo-cell { padding-top: 20px !important; }
              .school-logo-box { width: 72px !important; height: 72px !important; border-radius: 20px !important; }
              .school-logo-img { width: 72px !important; height: 72px !important; border-radius: 14px !important; }
              .hero-title { font-size: 28px !important; line-height: 1.14 !important; }
              .hero-copy { padding-right: 0 !important; }
              .content-cell { padding: 24px 20px !important; }
              .snapshot-cell { padding: 20px 18px !important; }
              .detail-label, .detail-value { display: block !important; width: 100% !important; text-align: left !important; border-bottom: 0 !important; padding: 4px 0 !important; }
              .detail-value { padding-bottom: 14px !important; border-bottom: 1px solid ${BRAND.line} !important; }
              .footer-cell { padding: 22px 20px !important; }
              .footer-right { padding-top: 12px !important; }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;background:#eef4ff;font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};">
          <table class="outer-wrap" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#eef4ff 0%,#ffffff 72%);padding:32px 16px;">
            <tr>
              <td align="center">
                <table class="email-shell" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:28px;overflow:hidden;box-shadow:0 24px 80px rgba(15,23,42,0.10);">
                  <tr>
                    <td class="hero-cell" style="padding:30px 34px;background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.navy} 100%);">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td class="brand-left" style="vertical-align:middle;">
                            <img src="${eduLogoUrl}" alt="EduBreezy" width="156" style="display:block;max-width:156px;height:auto;" />
                          </td>
                          <td class="brand-right" align="right" style="vertical-align:middle;">
                            <span style="display:inline-block;padding:10px 15px;border-radius:999px;background:rgba(255,255,255,0.14);color:#ffffff;font-size:12px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;">
                              School Created
                            </span>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:34px;">
                        <tr>
                          <td class="hero-copy" style="vertical-align:top;padding-right:18px;">
                            <div style="font-size:14px;color:#dbeafe;margin-bottom:10px;">Hi ${escapeHtml(safeRecipientName)},</div>
                            <h1 class="hero-title" style="margin:0;font-size:34px;line-height:1.14;font-weight:900;color:#ffffff;letter-spacing:0;">
                              ${escapeHtml(safeSchoolName)} is ready on EduBreezy.
                            </h1>
                            <p style="margin:16px 0 0;font-size:16px;line-height:1.72;color:#eaf2ff;max-width:480px;">
                              Your ERP workspace has been created successfully. ${escapeHtml(safeDirectorName)} is set as the main director for this school.
                            </p>
                          </td>
                          <td class="school-logo-cell" width="92" align="right" style="vertical-align:top;">
                            <div class="school-logo-box" style="width:82px;height:82px;border-radius:22px;background:#ffffff;padding:8px;box-shadow:0 16px 40px rgba(0,0,0,0.18);">
                              <img class="school-logo-img" src="${logoUrl}" alt="${escapeHtml(safeSchoolName)} logo" width="82" height="82" style="display:block;width:82px;height:82px;object-fit:contain;border-radius:16px;" />
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td class="content-cell" style="padding:34px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.soft};border:1px solid ${BRAND.line};border-radius:22px;">
                        <tr>
                          <td class="snapshot-cell" style="padding:24px;">
                            <div style="font-size:12px;font-weight:900;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND.primary};margin-bottom:10px;">
                              Workspace Snapshot
                            </div>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              ${detailRows}
                            </table>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                        <tr>
                          <td align="center">
                            <a href="${resolvedLoginUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;padding:15px 26px;border-radius:14px;">
                              Open EduBreezy Dashboard
                            </a>
                          </td>
                        </tr>
                      </table>

                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                        <tr>
                          <td style="font-size:18px;font-weight:900;color:${BRAND.ink};padding-bottom:14px;">Recommended launch steps</td>
                        </tr>
                        ${[
        ['Review the profile', 'Confirm school details, logo, contact email, phone, address, and workspace domain.'],
        ['Build the academic structure', 'Add classes, sections, academic year, subjects, and the core timetable foundation.'],
        ['Invite your people', 'Add admins, teachers, students, parents, and non-teaching staff with the correct access.'],
        ['Configure operations', 'Set fees, attendance, documents, communication, and approval workflows before going live.'],
      ]
        .map(
          ([title, body], index) => `
                              <tr>
                                <td style="padding:12px 0;">
                                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                      <td width="38" style="vertical-align:top;">
                                        <div style="width:30px;height:30px;border-radius:10px;background:#eaf2ff;color:${BRAND.primary};font-size:14px;font-weight:900;line-height:30px;text-align:center;">${index + 1}</div>
                                      </td>
                                      <td style="vertical-align:top;">
                                        <div style="font-size:15px;font-weight:800;color:${BRAND.ink};">${escapeHtml(title)}</div>
                                        <div style="font-size:14px;line-height:1.65;color:${BRAND.muted};margin-top:3px;">${escapeHtml(body)}</div>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            `
        )
        .join('')}
                      </table>

                      <div style="margin-top:28px;padding:20px 22px;border-radius:20px;background:#ecfdf5;border:1px solid #bbf7d0;">
                        <div style="font-size:15px;font-weight:900;color:#065f46;margin-bottom:6px;">A polished start for ${escapeHtml(safeSchoolName)}</div>
                        <div style="font-size:14px;line-height:1.7;color:#047857;">
                          Your team can begin setup immediately. For onboarding help, reply to this email and the EduBreezy team will assist.
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td class="footer-cell" style="padding:24px 34px 30px;border-top:1px solid ${BRAND.line};background:#ffffff;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td class="footer-left" style="font-size:13px;line-height:1.7;color:${BRAND.muted};">
                            Sent to ${escapeHtml(safeRole)} for ${escapeHtml(safeSchoolName)}.<br />
                            Team EduBreezy, hello@edubreezy.com
                          </td>
                          <td class="footer-right" align="right" style="font-size:13px;font-weight:800;color:${BRAND.success};">
                            Ready for onboarding
                          </td>
                        </tr>
                      </table>
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
