import type { Metadata } from "next";
import { connection } from "next/server";
import { getMachineInfo } from "@/lib/collect/machine";
import { requestLocale } from "@/lib/i18n/server";
import { uiText } from "@/lib/i18n/ui";
import { XRayApp } from "@/components/XRayApp";

export async function generateMetadata({ searchParams }: PageProps<"/">): Promise<Metadata> {
  const { meta } = uiText(await requestLocale((await searchParams).lang));
  return { title: meta.title, description: meta.description };
}

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();
  const [machine, params] = await Promise.all([getMachineInfo(), searchParams]);
  const locale = await requestLocale(params.lang);
  const flag = (key: string) => params[key] === "1";
  const part = typeof params.part === "string" ? params.part : null;
  return (
    <XRayApp
      initialMachine={machine}
      initialLocale={locale}
      initialView={{
        part,
        exploded: flag("exploded"),
        heat: flag("heat"),
        labels: params.labels !== "0",
        realistic: params.style === "real",
      }}
    />
  );
}
