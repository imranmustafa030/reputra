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
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/index.html" }],
    };
  },
};

export default nextConfig;
