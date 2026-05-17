import { Playfair_Display, DM_Sans } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${playfair.variable} ${dmSans.variable}`}>{children}</div>;
}
