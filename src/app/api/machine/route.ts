import { connection } from "next/server";
import { getMachineInfo } from "@/lib/collect/machine";

export async function GET() {
  await connection();
  return Response.json(await getMachineInfo());
}
