import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "NexCart — Curated Marketplace", template: "%s — NexCart" },
  description: "A curated multi-vendor marketplace connecting artisan vendors with discerning buyers worldwide.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-white font-sans text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
