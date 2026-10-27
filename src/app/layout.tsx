import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MotionProvider } from "@/components/motion/provider";
import "./globals.css";

// Layout for the Next.js side of the site (dashboard, checkout, admin, login, review pages).
// The marketing website at "/" is public/index.html and does not use it.

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Reputra", template: "%s · Reputra" },
  description: "More Google reviews for local businesses in Pakistan, from a counter stand, a tap card or WhatsApp.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='6' fill='%230b0c0e'/%3E%3Ccircle cx='8.5' cy='12' r='3.2' fill='%23f0ad2e'/%3E%3Cpath d='M14.2 5.4a8.6 8.6 0 0 1 0 13.2' fill='none' stroke='%23f0ad2e' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-frame font-sans text-ink antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
