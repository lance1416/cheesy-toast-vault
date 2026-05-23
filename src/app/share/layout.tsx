import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared entry | Cheesy Toast Vault",
  robots: { index: false, follow: false },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-10">
      {children}
    </div>
  );
}
