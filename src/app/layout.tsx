import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "캡스톤 과제 관리",
  description: "캡스톤 졸업 과제 게시·제출·피드백 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
