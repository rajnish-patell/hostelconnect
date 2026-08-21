const { Resend } = require('resend');
const nodemailer = require('nodemailer');

/**
 * Send real Email OTP using Resend API (or Nodemailer/Ethereal fallback if key not configured)
 */
async function sendResendOtpEmail({ toEmail, otpCode, parentName = 'Parent' }) {
  const normalizedEmail = toEmail.trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Hostel Connect <onboarding@resend.dev>';

  const subject = 'Your Hostel Connect Verification Code';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your Hostel Connect Verification Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Hostel Connect</h1>
            <p style="color: #e0f2fe; margin: 6px 0 0 0; font-size: 14px; font-weight: 500;">Parent Verification Code</p>
          </div>

          <!-- Content Body -->
          <div style="padding: 32px 24px;">
            <p style="font-size: 15px; color: #334155; margin-top: 0; margin-bottom: 20px;">
              Hello ${parentName},
            </p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 24px;">
              Use the 6-digit verification code below to log in to your Hostel Connect parent account.
            </p>

            <!-- OTP Box -->
            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 8px;">Your Verification Code</span>
              <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 38px; font-weight: 800; color: #0284c7; letter-spacing: 8px; margin: 0;">${otpCode}</div>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #dc2626; font-weight: 600;">
                ⏰ Expires in 5 minutes
              </p>
            </div>

            <!-- Security Warning -->
            <div style="background-color: #fffbe6; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 13px; color: #b45309; line-height: 1.4;">
                <strong>Security Notice:</strong> Do not share this OTP code with anyone. Hostel Connect staff will never call or message you asking for your verification code.
              </p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
              If you did not request this verification code, please ignore this email or contact support if you have security concerns.
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              © ${new Date().getFullYear()} Hostel Connect Platform. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  // 1. Send via Resend SDK if API Key is configured
  if (apiKey && apiKey.startsWith('re_')) {
    try {
      const resend = new Resend(apiKey);
      const res = await resend.emails.send({
        from: fromAddress,
        to: [normalizedEmail],
        subject,
        html: htmlContent,
      });

      console.log(`📧 [Resend API] Email OTP delivered.`);
      return { success: true };
    } catch (resendErr) {
      console.error('Resend API dispatch failed');
    }
  }

  // 2. Fallback to Nodemailer SMTP or Ethereal test inbox if RESEND_API_KEY is not configured
  try {
    let transporter;
    const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && smtpPass) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPass,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || fromAddress,
      to: normalizedEmail,
      subject,
      html: htmlContent,
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to dispatch verification email');
    throw new Error('Failed to send verification email. Please try again later.');
  }
}

module.exports = { sendResendOtpEmail };

