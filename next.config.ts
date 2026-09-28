import type { NextConfig } from "next";

// srcdoc app frames inherit this CSP: frame-src stops them navigating away; don't add script-src/default-src here (see AppFrame).
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-src 'self' data: blob:; frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
