import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

export async function createNotification({
  userId,
  type = "GENERAL",
  title,
  message,
  data = {},
  sendEmailNotification = false,
  userEmail = null,
}) {
  try {
    const admin = createAdminClient();

    const { data: notif, error } = await admin
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        email_sent: sendEmailNotification,
      })
      .select()
      .single();

    if (error) {
      console.error("[Notification Insert Error]:", error);
      return null;
    }

    if (sendEmailNotification && userEmail) {
      await sendEmail({
        to: userEmail,
        subject: title,
        html: `<p>${message}</p>`,
      });
    }

    return notif;
  } catch (err) {
    console.error("[Notification Service Exception]:", err);
    return null;
  }
}
