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
    icon: "/wortnah-logo-round-192.png",
    shortcut: "/wortnah-logo-round-192.png",
    apple: "/wortnah-logo-round-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="codex-preview" content="development" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
