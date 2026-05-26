import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "CTF-as-a-Service",
  description: "Run capture-the-flag events end to end.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-mono antialiased">
        <SiteHeader />
        <main className="container py-8">{children}</main>
      </body>
    </html>
  );
}
