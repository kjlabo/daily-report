import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "営業日報システム",
  description: "営業日報の作成・確認を行うシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
