/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=()",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https:; media-src 'self' blob: https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self';",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{
                key: "Strict-Transport-Security",
                value: "max-age=31536000; includeSubDomains",
              }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
