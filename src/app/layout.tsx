import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { VaultProvider } from "@/lib/vault-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cheesy Toast Vault",
  description: "Your personal encrypted password book",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <VaultProvider>{children}</VaultProvider>
      </body>
    </html>
  );
}
