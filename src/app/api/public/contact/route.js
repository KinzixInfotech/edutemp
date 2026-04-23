import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCache, setCache } from '@/lib/cache';
import { sendResendEmail } from '@/lib/resend';
import {
  buildContactAdminNotificationTemplate,
  buildContactThankYouTemplate,
} from '@/emails/contact-thank-you-template';

const IP_WINDOW_MS = 15 * 60 * 1000;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;

const IP_LIMIT = 5;
const EMAIL_LIMIT = 3;

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIp || 'unknown';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d+]/g, '').trim();
}

function sanitizeText(value) {
  return String(value || '').trim();
}

function buildDedupeKey({ email, phone, schoolName }) {
  return createHash('sha256')
    .update(`${normalizeEmail(email)}|${normalizePhone(phone)}|${sanitizeText(schoolName).toLowerCase()}`)
    .digest('hex');
}

async function consumeRateLimit({ key, maxAttempts, windowMs }) {
  const now = Date.now();
  const cachedAttempts = (await getCache(key)) || [];
  const recentAttempts = cachedAttempts.filter(
    (timestamp) => now - Number(timestamp) < windowMs
  );

  if (recentAttempts.length >= maxAttempts) {
    const retryAfterMs = windowMs - (now - Number(recentAttempts[0]));
    return {
      blocked: true,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  recentAttempts.push(now);
  await setCache(key, recentAttempts, Math.ceil(windowMs / 1000));

  return { blocked: false, retryAfterSeconds: 0 };
}

function getAdminRecipients() {
  const values = [
    process.env.CONTACT_NOTIFY_EMAIL,
    process.env.SUPER_ADMIN_CONTACT_EMAIL,
    process.env.SUPPORT_EMAIL,
    'hello@edubreezy.com',
  ]
    .flatMap((entry) => String(entry || '').split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);

  return [...new Set(values)];
}

function getResponseId(response) {
  return response?.data?.id || response?.id || null;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const submission = {
      name: sanitizeText(body.name),
      email: normalizeEmail(body.email),
      phone: normalizePhone(body.phone),
      schoolName: sanitizeText(body.schoolName),
      role: sanitizeText(body.role),
      studentCount: sanitizeText(body.studentCount),
      message: sanitizeText(body.message),
      demoPreferred: sanitizeText(body.demoPreferred),
    };

    if (!submission.name || !submission.email || !submission.phone || !submission.schoolName) {
      return NextResponse.json(
        { error: 'Name, email, phone, and school name are required.' },
        { status: 400 }
      );
    }

    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email);
    if (!emailLooksValid) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (submission.message.length > 2000) {
      return NextResponse.json(
        { error: 'Message is too long. Please keep it under 2000 characters.' },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || null;

    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit({
        key: `contact:ip:${ipAddress}`,
        maxAttempts: IP_LIMIT,
        windowMs: IP_WINDOW_MS,
      }),
      consumeRateLimit({
        key: `contact:email:${submission.email}`,
        maxAttempts: EMAIL_LIMIT,
        windowMs: EMAIL_WINDOW_MS,
      }),
    ]);

    if (ipLimit.blocked || emailLimit.blocked) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
      return NextResponse.json(
        {
          error: 'Too many contact requests. Please wait a little before trying again.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    const dedupeKey = buildDedupeKey(submission);
    const duplicateSince = new Date(Date.now() - DUPLICATE_WINDOW_MS);

    const existingSubmission = await prisma.contactSubmission.findFirst({
      where: {
        submittedAt: { gte: duplicateSince },
        OR: [
          { dedupeKey },
          { email: submission.email },
          { phone: submission.phone },
        ],
      },
      orderBy: { submittedAt: 'desc' },
    });

    if (existingSubmission) {
      return NextResponse.json(
        {
          error: 'We already received your request recently. Our team will connect with you shortly.',
        },
        { status: 409 }
      );
    }

    const createdSubmission = await prisma.contactSubmission.create({
      data: {
        ...submission,
        role: submission.role || null,
        studentCount: submission.studentCount || null,
        message: submission.message || null,
        demoPreferred: submission.demoPreferred || null,
        ipAddress,
        userAgent,
        dedupeKey,
      },
    });

    const origin = request.nextUrl.origin;
    const thankYouTemplate = buildContactThankYouTemplate({
      ...submission,
      origin,
    });
    const adminTemplate = buildContactAdminNotificationTemplate(createdSubmission);
    const adminRecipients = getAdminRecipients();

    let emailStatus = 'PENDING';
    let emailSentAt = null;
    let adminNotifiedAt = null;
    let emailProviderId = null;
    let adminEmailProviderId = null;
    let emailError = null;

    try {
      const customerEmailResponse = await sendResendEmail({
        to: submission.email,
        subject: thankYouTemplate.subject,
        html: thankYouTemplate.html,
        text: thankYouTemplate.text,
        replyTo: adminRecipients[0],
      });

      emailProviderId = getResponseId(customerEmailResponse);
      emailStatus = 'SENT';
      emailSentAt = new Date();

      if (adminRecipients.length > 0) {
        const adminEmailResponse = await sendResendEmail({
          to: adminRecipients,
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          text: adminTemplate.text,
          replyTo: submission.email,
        });

        adminEmailProviderId = getResponseId(adminEmailResponse);
        adminNotifiedAt = new Date();
      }
    } catch (error) {
      emailStatus = 'FAILED';
      emailError = error.message || 'Unknown email error';
      console.error('[CONTACT API][EMAIL ERROR]', error);
    }

    await prisma.contactSubmission.update({
      where: { id: createdSubmission.id },
      data: {
        emailStatus,
        emailSentAt,
        adminNotifiedAt,
        emailProviderId,
        adminEmailProviderId,
        emailError,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Thanks for contacting us. We will connect with you shortly.',
        emailSent: emailStatus === 'SENT',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[CONTACT API ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to submit contact request. Please try again.' },
      { status: 500 }
    );
  }
}
