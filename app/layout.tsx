import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "藏精閣微官網",
  description: "手機優先版微官網",
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