import { Resend } from 'resend';

const globalForResend = globalThis;

function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return new Resend(apiKey);
}

export function getResendClient() {
  if (!globalForResend.__edubreezyResendClient) {
    globalForResend.__edubreezyResendClient = createResendClient();
  }

  return globalForResend.__edubreezyResendClient;
}

export const resend = new Proxy(
  {},
  {
    get(_target, property) {
      return getResendClient()[property];
    },
  }
);

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
  cc,
  bcc,
}) {
  const recipients = Array.isArray(to) ? to : [to];
  const ccRecipients = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;
  const bccRecipients = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;
  const resendClient = getResendClient();

  const response = await resendClient.emails.send({
    from,
    to: recipients,
    cc: ccRecipients,
    bcc: bccRecipients,
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
