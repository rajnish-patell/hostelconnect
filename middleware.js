import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Public paths that do not require user session
  const isPublicPath =
    path === "/" ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/verify-email") ||
    path.startsWith("/callback") ||
    path.startsWith("/pricing") ||
    path.startsWith("/privacy") ||
    path.startsWith("/terms") ||
    path.startsWith("/contact") ||
    path.startsWith("/api/auth") ||
    path.startsWith("/api/webhooks") ||
    path.startsWith("/api/health") ||
    path.startsWith("/api/admin/bootstrap") ||
    path.startsWith("/device") || // Device kiosk has its own token / PIN authentication
    path.startsWith("/call") || // Active encrypted video calling room
    path.startsWith("/api/calls") || // Kiosk student calling & active session endpoints
    path.startsWith("/api/devices") || // Device activation and kiosk directory
    path.startsWith("/_next") ||
    path.includes(".");

  // Protected API routes: return JSON 401 instead of HTML redirect
  if (!user && path.startsWith("/api/") && !isPublicPath) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  // Protected Page paths: redirect to login
  if (!user && !isPublicPath) {
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // If user is already logged in and navigates to login/signup, redirect to respective dashboard
  if (user && (path === "/login" || path === "/signup")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "PARENT";
    if (role === "SUPER_ADMIN") {
      url.pathname = "/super-admin";
    } else if (role === "HOSTEL_ADMIN") {
      url.pathname = "/admin";
    } else if (role === "WARDEN" || role === "STAFF") {
      url.pathname = "/staff";
    } else {
      url.pathname = "/parent";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
