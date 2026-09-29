export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "pcx-locale";

/** BCP 47 tags for `<html lang>` and `Intl` formatting. */
export const LOCALE_TAG: Record<Locale, string> = { en: "en-US", zh: "zh-CN" };

export function toLocale(value: unknown): Locale | null {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value) ? (value as Locale) : null;
}
