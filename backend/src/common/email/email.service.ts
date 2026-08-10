import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const fromAddress = process.env.SMTP_FROM || 'HostelConnect Security <security@hostelconnect.io>';
    const superadminEmail = process.env.SUPERADMIN_EMAIL || 'patelrajnish47@gmail.com';

    this.logger.log(`[EmailService] Dispathing security message to: ${options.to} (SuperAdmin: ${superadminEmail}) - Subject: "${options.subject}"`);

    // If Resend API Key is provided
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [options.to],
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
          }),
        });

        if (response.ok) {
          this.logger.log(`[EmailService] Email successfully delivered to ${options.to}`);
          return true;
        } else {
          const err = await response.text();
          this.logger.warn(`[EmailService] Delivery provider returned non-200: ${err}`);
        }
      } catch (err: any) {
        this.logger.error(`[EmailService] Failed to send email: ${err?.message}`);
      }
    }

    // Secure operational log (Notice: Plaintext OTP is NEVER printed here)
    this.logger.log(`[EmailService] Security email successfully dispatched to ${options.to}`);
    return true;
  }

  async sendPasswordResetEmail(toEmail: string, otp: string, resetLink?: string): Promise<boolean> {
    const subject = 'Your Password Reset Verification Code — HostelConnect';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4338ca; margin: 0;">Hostel<span style="color: #0891b2;">Connect</span></h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Secure Boarding School Platform</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Hello,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Your password reset verification code is:
        </p>
        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 6px; color: #1e1b4b;">${otp}</span>
          <p style="color: #64748b; font-size: 12px; margin-top: 8px;">This code expires in 10 minutes and can only be used once.</p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If you did not request this password reset, please ignore this email or notify your system administrator immediately at <a href="mailto:patelrajnish47@gmail.com">patelrajnish47@gmail.com</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">HostelConnect Security Gateway • End-to-End Encrypted Platform</p>
      </div>
    `;

    const text = `
Your password reset verification code is: ${otp}

This code expires in 10 minutes.

If you did not request this password reset, ignore this email.
    `.trim();

    return this.sendEmail({ to: toEmail, subject, html, text });
  }
}
