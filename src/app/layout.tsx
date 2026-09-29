import type { Metadata } from "next";
import { LOCALE_TAG } from "@/i18n/config";
import { requestLocale } from "@/i18n/server";
import { uiText } from "@/i18n/ui";
import "./globals.css";

const { meta } = uiText("en");

export const metadata: Metadata = {
  title: meta.title,
  description: meta.description,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await requestLocale();
  return (
    <html lang={LOCALE_TAG[locale]} className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
