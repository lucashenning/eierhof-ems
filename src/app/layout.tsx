import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eierhof EMS",
  description: "Lieferschein- und Rechnungs-Management — Eierhof Groß Lafferde GbR",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
