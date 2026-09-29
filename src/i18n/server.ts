import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, toLocale, type Locale } from "./config";

/** `?lang=` wins over the saved cookie; otherwise English. */
export async function requestLocale(lang?: string | string[]): Promise<Locale> {
  return toLocale(lang) ?? toLocale((await cookies()).get(LOCALE_COOKIE)?.value) ?? DEFAULT_LOCALE;
}
