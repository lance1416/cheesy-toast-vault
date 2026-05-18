import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { VaultProvider } from "@/lib/vault-context";
import { ColorSchemeProvider } from "@/lib/color-scheme";
import Providers from "@/components/providers";
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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong colour scheme before JS hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('ct-color-scheme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(s!=='light'&&d))document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <ColorSchemeProvider>
            <VaultProvider>{children}</VaultProvider>
          </ColorSchemeProvider>
        </Providers>
      </body>
    </html>
  );
}
