import { connection } from "next/server";
import { getMachineInfo } from "@/lib/collect/machine";
import { XRayApp } from "@/components/XRayApp";

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection();
  const [machine, params] = await Promise.all([getMachineInfo(), searchParams]);
  const flag = (key: string) => params[key] === "1";
  const part = typeof params.part === "string" ? params.part : null;
  return (
    <XRayApp
      initialMachine={machine}
      initialView={{ part, exploded: flag("exploded"), heat: flag("heat"), labels: params.labels !== "0" }}
    />
  );
}
