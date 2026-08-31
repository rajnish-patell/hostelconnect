import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/";

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session?.user) {
      const user = session.user;
      const admin = createAdminClient();

      // Check if profile exists, otherwise create it as PARENT
      let { data: profile } = await admin
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (!profile) {
        const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Parent";
        const { data: newProfile } = await admin
          .from("profiles")
          .upsert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            role: "PARENT",
            is_active: true,
            email_verified: true,
          })
          .select()
          .single();
        profile = newProfile;
      }

      // Ensure a parent record exists in the parents table
      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Parent";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "Parent";
      const lastName = nameParts.slice(1).join(" ") || "";

      let { data: parentRecord } = await admin
        .from("parents")
        .select("id")
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .single();

      if (!parentRecord) {
        await admin.from("parents").insert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName || null,
          email: user.email,
          phone: user.phone || user.user_metadata?.phone || null,
          is_active: true,
        });
      } else {
        // Link user_id if not linked
        await admin.from("parents").update({ user_id: user.id }).eq("id", parentRecord.id);
      }

      const role = profile?.role || "PARENT";

      if (redirectTo && redirectTo !== "/" && !redirectTo.includes("/login")) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }

      if (role === "SUPER_ADMIN") {
        return NextResponse.redirect(`${origin}/super-admin`);
      } else if (role === "HOSTEL_ADMIN") {
        return NextResponse.redirect(`${origin}/admin`);
      } else if (role === "WARDEN" || role === "STAFF") {
        return NextResponse.redirect(`${origin}/staff`);
      } else {
        return NextResponse.redirect(`${origin}/parent`);
      }
    }
  }

  // Return to login with error if verification fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
