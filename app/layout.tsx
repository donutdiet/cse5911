import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anatomy Study Groups",
  description: "Enhance your learning with interactive study groups",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} text-foreground antialiased`}
      >
        <div className="min-h-screen w-full bg-muted/15">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
