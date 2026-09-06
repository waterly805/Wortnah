import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wortnah — Sagen, was wichtig ist.",
  description: "Barrierearme Kommunikation und unterstütztes Sprechtraining.",
  manifest: "/manifest.webmanifest",
  applicationName: "Wortnah",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wortnah",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
