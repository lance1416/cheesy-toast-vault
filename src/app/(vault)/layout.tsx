import { Playfair_Display, DM_Sans } from "next/font/google";
import { VaultProvider } from "@/lib/vault-context";

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

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} ${dmSans.variable}`}>
      <VaultProvider>{children}</VaultProvider>
    </div>
  );
}
