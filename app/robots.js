export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/super-admin/", "/staff/", "/parent/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
