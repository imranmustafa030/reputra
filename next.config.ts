import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The marketing website is plain HTML in public/ (index.html, site.css, site.js, card3d.js, img/).
  // Serve it at "/" exactly as it is; everything else (/dashboard, /r/…, /api/…) is the Next.js app.
  // The opening film's files carry their version in the name (intro-portrait.v1.av1.webm), so a
  // phone that has seen it once never downloads it again.
  async headers() {
    return [{ source: "/film/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
    };
  },
};

export default nextConfig;
