import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Demiurge — Sovereign Digital Pantheon",
  description: "A sovereign L1 and creator economy for Archons and Nomads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="gradient-orbit min-h-screen antialiased">
        <div className="min-h-screen bg-slate-950/80">
          {children}
        </div>
      </body>
    </html>
  );
}
