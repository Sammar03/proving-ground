import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { Anton, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Gate from "./gate";

const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const plexSans = IBM_Plex_Sans({ weight: ["400", "500", "600"], subsets: ["latin"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ weight: ["400", "500"], subsets: ["latin"], variable: "--font-plex-mono", display: "swap" });

export const metadata = { title: "Proving Ground — AI Model Arena" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-display text-xl text-bone transition-colors hover:text-gold">
              Proving Ground
            </Link>
            <div className="flex items-center gap-6 font-mono text-xs uppercase tracking-widest">
              <Link href="/" className="text-ash transition-colors hover:text-bone">
                New&nbsp;bout
              </Link>
              <Link href="/history" className="text-ash transition-colors hover:text-bone">
                Standings
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">
          <Gate>{children}</Gate>
        </main>
        <Analytics />
      </body>
    </html>
  );
}
