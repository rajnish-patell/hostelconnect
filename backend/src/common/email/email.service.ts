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

    this.logger.log(`[EmailService] Preparing email to: ${options.to} (SuperAdmin: ${superadminEmail}) - Subject: "${options.subject}"`);

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
          this.logger.log(`[EmailService] Email successfully dispatched via Resend to ${options.to}`);
          return true;
        } else {
          const err = await response.text();
          this.logger.warn(`[EmailService] Resend dispatch failed: ${err}`);
        }
      } catch (err: any) {
        this.logger.error(`[EmailService] Failed to send email via Resend: ${err?.message}`);
      }
    }

    // Fallback / Development logging:
    this.logger.log(`==================== [SECURE EMAIL DISPATCH] ====================`);
    this.logger.log(`To: ${options.to}`);
    this.logger.log(`From: ${fromAddress}`);
    this.logger.log(`Subject: ${options.subject}`);
    this.logger.log(`Content:\n${options.text || options.html.replace(/<[^>]*>?/gm, '')}`);
    this.logger.log(`================================================================`);

    return true;
  }

  async sendPasswordResetEmail(toEmail: string, resetToken: string, resetLink: string): Promise<boolean> {
    const subject = 'HostelConnect — Password Reset Verification Code & Link';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4338ca; margin: 0;">Hostel<span style="color: #0891b2;">Connect</span></h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Secure Boarding School Platform</p>
        </div>
        <p style="color: #334155; font-size: 15px;">Hello,</p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          We received a request to reset your password for your HostelConnect account. Use the secure 6-digit verification code below or click the reset button:
        </p>
        <div style="background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
          <span style="font-size: 28px; font-weight: 800; font-family: monospace; letter-spacing: 4px; color: #1e1b4b;">${resetToken}</span>
          <p style="color: #64748b; font-size: 12px; margin-top: 8px;">This code is valid for 15 minutes and can only be used once.</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password Online</a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If you did not request a password reset, please ignore this email or notify your system administrator immediately at <a href="mailto:patelrajnish47@gmail.com">patelrajnish47@gmail.com</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">HostelConnect Security Gateway • End-to-End Encrypted Platform</p>
      </div>
    `;

    const text = `
HostelConnect Password Reset
Verification Code: ${resetToken}
Reset Link: ${resetLink}
This code is valid for 15 minutes. If you did not request this, contact patelrajnish47@gmail.com.
    `.trim();

    return this.sendEmail({ to: toEmail, subject, html, text });
  }
}
