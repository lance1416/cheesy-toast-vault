import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "../globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Shared entry | Cheesy Toast Vault",
  robots: { index: false, follow: false },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-canvas flex flex-col items-center justify-center px-4 py-10">
        {children}
      </body>
    </html>
  );
}
