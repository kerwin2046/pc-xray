import type { Metadata } from "next";
import { connection } from "next/server";
import { XRayApp } from "@/features/xray";
import { requestLocale } from "@/i18n/server";
import { uiText } from "@/i18n/ui";
import { getMachineInfo } from "@/server/hardware/machine";

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
