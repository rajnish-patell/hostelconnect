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
    path.startsWith("/device") || // Device kiosk has its own 4-digit PIN authentication
    path.startsWith("/call") || // Encrypted video calling room
    path.startsWith("/api/calls") || // Kiosk student calling & session endpoints
    path.startsWith("/api/devices") || // Device activation and directory
    path.startsWith("/_next") ||
    path.includes(".");

  // 1. Protected API routes: return JSON 401 instead of HTML redirect
  if (!user && path.startsWith("/api/") && !isPublicPath) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  // 2. Protected Page paths: redirect unauthenticated users to login
  if (!user && !isPublicPath) {
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // 3. Strict Role-Based Access Control (RBAC) Guard for authenticated users
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "PARENT";

    // Prevent Parents from accessing admin or super-admin routes
    if (role === "PARENT") {
      if (path.startsWith("/admin") || path.startsWith("/super-admin") || path.startsWith("/staff")) {
        url.pathname = "/parent";
        return NextResponse.redirect(url);
      }
    }

    // Prevent School Admins from accessing super-admin routes
    if (role === "HOSTEL_ADMIN") {
      if (path.startsWith("/super-admin")) {
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
    }

    // If user is logged in and navigates to login/signup, redirect to respective dashboard
    if (path === "/login" || path === "/signup") {
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
