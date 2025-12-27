import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import sgMail from '@sendgrid/mail';

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'nodemailer'; // 'nodemailer', 'resend', 'sendgrid'

// ==================== NODEMAILER SETUP ====================
let nodemailerTransporter;
if (EMAIL_PROVIDER === 'nodemailer') {
    nodemailerTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// ==================== RESEND SETUP ====================
let resendClient;
if (EMAIL_PROVIDER === 'resend') {
    resendClient = new Resend(process.env.RESEND_API_KEY);
}

// ==================== SENDGRID SETUP ====================
if (EMAIL_PROVIDER === 'sendgrid') {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send email using configured provider
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @param {Array} options.attachments - Array of attachments (optional)
 * @param {string} options.from - Sender email (optional)
 * @param {Array} options.cc - CC recipients (optional)
 * @param {Array} options.bcc - BCC recipients (optional)
 */
export async function sendEmail(options) {
    const {
        to,
        subject,
        html,
        text,
        attachments = [],
        from = process.env.EMAIL_FROM || 'noreply@yourdomain.com',
        cc = [],
        bcc = [],
    } = options;

    try {
        switch (EMAIL_PROVIDER) {
            case 'nodemailer':
                return await sendWithNodemailer({ to, subject, html, text, attachments, from, cc, bcc });

            case 'resend':
                return await sendWithResend({ to, subject, html, text, attachments, from });

            case 'sendgrid':
                return await sendWithSendGrid({ to, subject, html, text, attachments, from, cc, bcc });

            default:
                throw new Error(`Unsupported email provider: ${EMAIL_PROVIDER}`);
        }
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// ==================== NODEMAILER IMPLEMENTATION ====================
async function sendWithNodemailer({ to, subject, html, text, attachments, from, cc, bcc }) {
    const mailOptions = {
        from: `"${process.env.APP_NAME || 'School Management'}" <${from}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        cc: cc.length > 0 ? cc.join(', ') : undefined,
        bcc: bcc.length > 0 ? bcc.join(', ') : undefined,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no plain text provided
        attachments: attachments.map(att => ({
            filename: att.filename,
            path: att.path || att.content,
            contentType: att.contentType,
        })),
    };

    const info = await nodemailerTransporter.sendMail(mailOptions);
    return {
        success: true,
        messageId: info.messageId,
        provider: 'nodemailer',
    };
}

// ==================== RESEND IMPLEMENTATION ====================
async function sendWithResend({ to, subject, html, text, attachments, from }) {
    const emailData = {
        from: `${process.env.APP_NAME || 'School Management'} <${from}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || undefined,
        attachments: attachments.map(att => ({
            filename: att.filename,
            content: att.content || att.path,
        })),
    };

    const data = await resendClient.emails.send(emailData);
    return {
        success: true,
        messageId: data.id,
        provider: 'resend',
    };
}

// ==================== SENDGRID IMPLEMENTATION ====================
async function sendWithSendGrid({ to, subject, html, text, attachments, from, cc, bcc }) {
    const msg = {
        to: Array.isArray(to) ? to : [to],
        from: {
            email: from,
            name: process.env.APP_NAME || 'School Management',
        },
        cc: cc.length > 0 ? cc : undefined,
        bcc: bcc.length > 0 ? bcc : undefined,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
        attachments: await Promise.all(attachments.map(async att => {
            let content;
            if (att.content) {
                content = Buffer.from(att.content).toString('base64');
            } else if (att.path) {
                // If path is URL, fetch it
                if (att.path.startsWith('http')) {
                    const response = await fetch(att.path);
                    const buffer = await response.arrayBuffer();
                    content = Buffer.from(buffer).toString('base64');
                } else {
                    const fs = require('fs');
                    content = fs.readFileSync(att.path).toString('base64');
                }
            }
            return {
                content,
                filename: att.filename,
                type: att.contentType || 'application/pdf',
                disposition: 'attachment',
            };
        })),
    };

    const [response] = await sgMail.send(msg);
    return {
        success: true,
        messageId: response.headers['x-message-id'],
        provider: 'sendgrid',
    };
}

// ==================== EMAIL TEMPLATES ====================

/**
 * Certificate email template
 */
export function getCertificateEmailTemplate({ studentName, certificateName, certificateNumber, issueDate, schoolName }) {
    return {
        subject: `Your ${certificateName} - ${schoolName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border: 1px solid #e0e0e0;
                    }
                    .certificate-details {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #667eea;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .detail-row:last-child {
                        border-bottom: none;
                    }
                    .label {
                        font-weight: bold;
                        color: #555;
                    }
                    .value {
                        color: #333;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #777;
                        font-size: 12px;
                        border-top: 1px solid #e0e0e0;
                        margin-top: 20px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin: 0;">🎓 ${schoolName}</h1>
                    <p style="margin: 10px 0 0 0;">Certificate Issued</p>
                </div>
                
                <div class="content">
                    <h2>Dear ${studentName},</h2>
                    
                    <p>Congratulations! Your <strong>${certificateName}</strong> has been successfully generated and is attached to this email.</p>
                    
                    <div class="certificate-details">
                        <h3 style="margin-top: 0; color: #667eea;">Certificate Details</h3>
                        <div class="detail-row">
                            <span class="label">Certificate Type:</span>
                            <span class="value">${certificateName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Certificate Number:</span>
                            <span class="value">${certificateNumber}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Issue Date:</span>
                            <span class="value">${issueDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Student Name:</span>
                            <span class="value">${studentName}</span>
                        </div>
                    </div>
                    
                    <p><strong>📎 The certificate is attached as a PDF file to this email.</strong></p>
                    
                    <p>Please keep this certificate safe for your records. If you need any additional information or have any questions, please contact the school administration.</p>
                    
                    <div style="text-align: center;">
                        <a href="#" class="button">View Certificate Online</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p><strong>${schoolName}</strong></p>
                    <p>This is an automated email. Please do not reply to this message.</p>
                    <p>&copy; ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
                </div>
            </body>
            </html>
        `,
        text: `
Dear ${studentName},

Congratulations! Your ${certificateName} has been successfully generated.

Certificate Details:
- Certificate Type: ${certificateName}
- Certificate Number: ${certificateNumber}
- Issue Date: ${issueDate}
- Student Name: ${studentName}

The certificate is attached as a PDF file to this email.

Best regards,
${schoolName}
        `.trim(),
    };
}

/**
 * ID Card email template
 */
export function getIdCardEmailTemplate({ studentName, schoolName, validUntil }) {
    return {
        subject: `Your Digital ID Card - ${schoolName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border: 1px solid #e0e0e0;
                    }
                    .id-card-box {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        text-align: center;
                        border: 2px dashed #667eea;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #777;
                        font-size: 12px;
                        border-top: 1px solid #e0e0e0;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin: 0;">🪪 ${schoolName}</h1>
                    <p style="margin: 10px 0 0 0;">Digital ID Card</p>
                </div>
                
                <div class="content">
                    <h2>Dear ${studentName},</h2>
                    
                    <p>Your digital ID card has been generated and is attached to this email.</p>
                    
                    <div class="id-card-box">
                        <h3 style="margin-top: 0; color: #667eea;">📱 Digital ID Card</h3>
                        <p><strong>Valid Until:</strong> ${validUntil}</p>
                        <p style="font-size: 12px; color: #666;">Please carry this ID card at all times on campus.</p>
                    </div>
                    
                    <p><strong>📎 Your ID card is attached as a PDF file.</strong></p>
                    
                    <p>You can print this ID card or save it on your mobile device for digital access.</p>
                </div>
                
                <div class="footer">
                    <p><strong>${schoolName}</strong></p>
                    <p>&copy; ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
                </div>
            </body>
            </html>
        `,
    };
}

/**
 * Admit Card email template
 */
export function getAdmitCardEmailTemplate({ studentName, examName, examDate, seatNumber, center, schoolName }) {
    return {
        subject: `Admit Card - ${examName} - ${schoolName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border: 1px solid #e0e0e0;
                    }
                    .exam-details {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #f59e0b;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .detail-row:last-child {
                        border-bottom: none;
                    }
                    .alert {
                        background: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #777;
                        font-size: 12px;
                        border-top: 1px solid #e0e0e0;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin: 0;">📝 ${schoolName}</h1>
                    <p style="margin: 10px 0 0 0;">Examination Admit Card</p>
                </div>
                
                <div class="content">
                    <h2>Dear ${studentName},</h2>
                    
                    <p>Your admit card for <strong>${examName}</strong> has been generated.</p>
                    
                    <div class="exam-details">
                        <h3 style="margin-top: 0; color: #f59e0b;">Examination Details</h3>
                        <div class="detail-row">
                            <span class="label"><strong>Exam Name:</strong></span>
                            <span class="value">${examName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label"><strong>Exam Date:</strong></span>
                            <span class="value">${examDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label"><strong>Seat Number:</strong></span>
                            <span class="value">${seatNumber}</span>
                        </div>
                        ${center ? `
                        <div class="detail-row">
                            <span class="label"><strong>Exam Center:</strong></span>
                            <span class="value">${center}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="alert">
                        <strong>⚠️ Important Instructions:</strong>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>Carry this admit card to the examination hall</li>
                            <li>Arrive at least 30 minutes before the exam</li>
                            <li>Bring a valid photo ID for verification</li>
                            <li>Mobile phones are not allowed in the exam hall</li>
                        </ul>
                    </div>
                    
                    <p><strong>📎 Your admit card is attached as a PDF file.</strong></p>
                    
                    <p>Please print your admit card and carry it to the examination center. Without the admit card, you will not be allowed to take the exam.</p>
                    
                    <p>Best of luck for your examination!</p>
                </div>
                
                <div class="footer">
                    <p><strong>${schoolName}</strong></p>
                    <p>&copy; ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
                </div>
            </body>
            </html>
        `,
    };
}

/**
 * Account Credentials email template (for bulk import)
 */
export function getAccountCredentialsEmailTemplate({ userName, email, password, userType, schoolName, loginUrl }) {
    const typeLabels = {
        student: 'Student',
        teacher: 'Teacher',
        staff: 'Staff Member',
        parent: 'Parent'
    };

    return {
        subject: `Welcome to ${schoolName} - Your Account Details`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px;
                        text-align: center;
                        border-radius: 10px 10px 0 0;
                    }
                    .content {
                        background: #f9f9f9;
                        padding: 30px;
                        border: 1px solid #e0e0e0;
                    }
                    .credentials-box {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        border-left: 4px solid #10b981;
                    }
                    .credential-item {
                        padding: 10px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .credential-item:last-child {
                        border-bottom: none;
                    }
                    .label {
                        font-weight: bold;
                        color: #555;
                        font-size: 12px;
                        text-transform: uppercase;
                    }
                    .value {
                        font-size: 16px;
                        color: #333;
                        font-family: monospace;
                        background: #f0f0f0;
                        padding: 8px 12px;
                        border-radius: 4px;
                        margin-top: 4px;
                        display: inline-block;
                    }
                    .alert {
                        background: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                        font-size: 13px;
                    }
                    .button {
                        display: inline-block;
                        padding: 14px 40px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #777;
                        font-size: 12px;
                        border-top: 1px solid #e0e0e0;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin: 0;">🎓 Welcome to ${schoolName}</h1>
                    <p style="margin: 10px 0 0 0;">Your account has been created</p>
                </div>
                
                <div class="content">
                    <h2>Hello ${userName}!</h2>
                    
                    <p>Your <strong>${typeLabels[userType] || 'User'}</strong> account has been created on ${schoolName}'s school management system. Below are your login credentials:</p>
                    
                    <div class="credentials-box">
                        <h3 style="margin-top: 0; color: #10b981;">🔐 Your Login Credentials</h3>
                        <div class="credential-item">
                            <div class="label">Email</div>
                            <div class="value">${email}</div>
                        </div>
                        <div class="credential-item">
                            <div class="label">Password</div>
                            <div class="value">${password}</div>
                        </div>
                    </div>
                    
                    <div class="alert">
                        <strong>⚠️ Important:</strong> For security reasons, we recommend changing your password after your first login.
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${loginUrl || '#'}" class="button">Login to Your Account</a>
                    </div>
                    
                    <p>If you have any questions or need assistance, please contact the school administration.</p>
                </div>
                
                <div class="footer">
                    <p><strong>${schoolName}</strong></p>
                    <p>This is an automated email. Please do not reply.</p>
                    <p>&copy; ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
                </div>
            </body>
            </html>
        `,
        text: `
Welcome to ${schoolName}!

Hello ${userName},

Your ${typeLabels[userType] || 'User'} account has been created.

Login Credentials:
- Email: ${email}
- Password: ${password}

Please change your password after your first login.

Login URL: ${loginUrl || 'Contact your school for the login link'}

Best regards,
${schoolName}
        `.trim(),
    };
}

// ==================== BULK EMAIL SENDING ====================

/**
 * Send bulk emails with rate limiting
 */
export async function sendBulkEmails(emails, options = {}) {
    const {
        batchSize = 10,
        delayBetweenBatches = 1000, // 1 second
    } = options;

    const results = [];

    for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
            batch.map(email => sendEmail(email))
        );

        results.push(...batchResults);

        // Delay between batches to avoid rate limiting
        if (i + batchSize < emails.length) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
        total: emails.length,
        successful,
        failed,
        results,
    };
}