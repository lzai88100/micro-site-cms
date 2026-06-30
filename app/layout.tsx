import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "藏精閣｜資訊中心",
  description: "藏精閣｜微官網",
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