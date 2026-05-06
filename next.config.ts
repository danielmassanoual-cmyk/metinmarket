import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : "*.supabase.co";

const nextConfig: NextConfig = {
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.tawk.to https://*.tawk.link",
      `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://challenges.cloudflare.com https://*.tawk.to wss://*.tawk.to https://*.tawk.link`,
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://embed.tawk.to https://*.tawk.to",
      "frame-src https://challenges.cloudflare.com https://*.tawk.to https://*.tawk.link",
      "style-src 'self' 'unsafe-inline' https://*.tawk.to https://*.tawk.link",
      "font-src 'self' data: https://*.tawk.to https://*.tawk.link",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
