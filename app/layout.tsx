import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "藏精閣｜資訊中心",
  description: "藏精閣官方資訊中心",
  icons: {
    icon: "/favicon.png?v=3",
    shortcut: "/favicon.png?v=3",
    apple: "/favicon.png?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}