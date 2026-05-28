import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "在线笔记",
  description: "个人自托管 Markdown 在线笔记",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
