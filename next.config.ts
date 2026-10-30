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
  // The opening film, the website's font and its libraries carry their version in the name
  // (intro-portrait.v1.av1.webm, geist-latin.v1.woff2, gsap-3.12.5.min.js), so a phone that has
  // seen them once never downloads them again.
  async headers() {
    const forever = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return ["/film/:file*", "/fonts/:file*", "/vendor/:file*"].map((source) => ({ source, headers: forever }));
  },
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
    };
  },
};

export default nextConfig;
