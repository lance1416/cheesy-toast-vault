import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display, DM_Sans } from "next/font/google";
import { VaultProvider } from "@/context/vault";
import { ColorSchemeProvider } from "@/context/color-scheme";
import Providers from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d97706" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Cheesy Toast Vault",
    template: "%s | Cheesy Toast Vault",
  },
  description: "Your personal encrypted password book",
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "Cheesy Toast Vault",
    title: "Cheesy Toast Vault",
    description: "Your personal encrypted password book",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cheesy Toast Vault",
    description: "Your personal encrypted password book",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${dmSans.variable} h-full antialiased`}
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
