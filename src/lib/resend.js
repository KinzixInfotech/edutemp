import { Resend } from 'resend';

const globalForResend = globalThis;

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(apiKey);
}

export const resend =
  globalForResend.__edubreezyResendClient || createResendClient();

globalForResend.__edubreezyResendClient = resend;

export function getResendFromEmail() {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    'EduBreezy <no_reply@edubreezy.com>'
  );
}

export async function sendResendEmail({
  to,
  subject,
  html,
  text,
  from = getResendFromEmail(),
  replyTo,
}) {
  const recipients = Array.isArray(to) ? to : [to];

  const response = await resend.emails.send({
    from,
    to: recipients,
    subject,
    html,
    text,
    replyTo,
  });

  if (response?.error) {
    throw new Error(response.error.message || 'Failed to send email via Resend');
  }

  return response;
}
