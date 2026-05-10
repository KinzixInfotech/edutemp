import { NextResponse } from 'next/server';
import { verifyRoleAccess } from '@/lib/api-auth';
import { sendResendEmail } from '@/lib/resend';
import { getEmailPreviewTemplate } from '@/emails/template-preview-registry';
import { getPublicEmailAssetOrigin } from '@/lib/email-assets';

const TEST_EMAIL_FROM = 'EduBreezy <hello@edubreezy.com>';

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export async function POST(request) {
  const auth = await verifyRoleAccess(request, ['SUPER_ADMIN']);
  if (auth.error) return auth.response;

  try {
    const body = await request.json();
    const to = String(body.to || '').trim().toLowerCase();
    const templateId = String(body.templateId || 'school-welcome').trim();
    const fields = body.fields && typeof body.fields === 'object' ? body.fields : {};

    if (!isValidEmail(to)) {
      return NextResponse.json({ error: 'Please enter a valid test email address.' }, { status: 400 });
    }

    const origin = getPublicEmailAssetOrigin(request.nextUrl.origin);
    const selectedTemplate = getEmailPreviewTemplate({ templateId, fields, origin });

    const response = await sendResendEmail({
      to,
      from: TEST_EMAIL_FROM,
      replyTo: 'hello@edubreezy.com',
      subject: `[Test] ${selectedTemplate.template.subject}`,
      html: selectedTemplate.template.html,
      text: selectedTemplate.template.text,
    });

    return NextResponse.json({
      success: true,
      templateId: selectedTemplate.id,
      to,
      providerId: response?.data?.id || response?.id || null,
    });
  } catch (error) {
    console.error('[SUPER ADMIN EMAIL CONFIGURATION][SEND TEST]', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send test email.' },
      { status: 500 }
    );
  }
}
