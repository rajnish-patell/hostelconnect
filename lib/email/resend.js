import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "HostelConnect <notifications@hostelconnect.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Send transactional email safely.
 * Will log warning if RESEND_API_KEY is not configured or in dev mode.
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    console.info(`[Email Preview / Mock Mode] To: ${to} | Subject: "${subject}" | (Set RESEND_API_KEY in .env.local to send live emails)`);
    return { success: true, mocked: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || subject,
    });

    if (error) {
      console.error("[Resend Error]:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[Email Exception]:", err);
    return { success: false, error: err.message };
  }
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

function baseEmailTemplate({ title, content, ctaText, ctaLink }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 14px; }
    .body { padding: 32px 24px; line-height: 1.6; font-size: 15px; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 24px 0; text-align: center; }
    .footer { background-color: #f1f5f9; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .box { background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HostelConnect</h1>
      <p>Secure Student & Parent Communication</p>
    </div>
    <div class="body">
      <h2>${title}</h2>
      ${content}
      ${ctaText && ctaLink ? `<div style="text-align: center;"><a href="${ctaLink}" class="button">${ctaText}</a></div>` : ""}
      <p style="color: #64748b; font-size: 13px;">If you have any questions or did not expect this communication, please contact your hostel administration immediately.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HostelConnect. All rights reserved.</p>
      <p>This is an automated operational notification. Do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendCallInvitationEmail({ to, parentName, studentName, hostelName, callUrl, scheduledTime }) {
  const content = `
    <p>Dear <strong>${parentName}</strong>,</p>
    <p>A video call session has been prepared with your child <strong>${studentName}</strong> from <strong>${hostelName}</strong>.</p>
    <div class="box">
      <strong>Student:</strong> ${studentName}<br>
      <strong>Hostel:</strong> ${hostelName}<br>
      ${scheduledTime ? `<strong>Scheduled Time:</strong> ${scheduledTime}<br>` : "<strong>Status:</strong> Available to join now"}
    </div>
    <p>Please click the button below to securely connect to the supervised video session.</p>
  `;

  return sendEmail({
    to,
    subject: `Video Call with ${studentName} — HostelConnect`,
    html: baseEmailTemplate({
      title: `Call Ready with ${studentName}`,
      content,
      ctaText: "Join Video Call",
      ctaLink: callUrl || `${APP_URL}/parent`,
    }),
  });
}

export async function sendParentLinkedEmail({ to, parentName, studentName, hostelName }) {
  const content = `
    <p>Dear <strong>${parentName}</strong>,</p>
    <p>You have been successfully registered and linked as a verified parent/guardian for <strong>${studentName}</strong> at <strong>${hostelName}</strong>.</p>
    <p>You can now log in to the HostelConnect parent portal to view calling schedules, book slots, and receive video calls from the hostel calling kiosk.</p>
  `;

  return sendEmail({
    to,
    subject: `Parent Portal Access for ${studentName} — HostelConnect`,
    html: baseEmailTemplate({
      title: "Account Linked Successfully",
      content,
      ctaText: "Access Parent Portal",
      ctaLink: `${APP_URL}/parent`,
    }),
  });
}

export async function sendPaymentReceiptEmail({ to, orgName, planName, amountFormatted, invoiceId }) {
  const content = `
    <p>Thank you for your payment. Your subscription has been activated.</p>
    <div class="box">
      <strong>Organization:</strong> ${orgName}<br>
      <strong>Plan:</strong> ${planName}<br>
      <strong>Amount Paid:</strong> ${amountFormatted}<br>
      <strong>Receipt / Ref:</strong> ${invoiceId}
    </div>
    <p>Your hostel calling kiosks, student directories, and admin privileges are active.</p>
  `;

  return sendEmail({
    to,
    subject: `Payment Successful — ${planName} Subscription`,
    html: baseEmailTemplate({
      title: "Payment Receipt",
      content,
      ctaText: "View Billing Dashboard",
      ctaLink: `${APP_URL}/admin/billing`,
    }),
  });
}
