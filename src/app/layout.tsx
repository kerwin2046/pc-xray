import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PC·XRAY · 透视你的电脑",
  description: "读取本机真实硬件信息，用可交互的 3D 透视模型展示电脑内部结构。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
