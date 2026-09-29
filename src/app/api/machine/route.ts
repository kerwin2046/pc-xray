import { connection } from "next/server";
import { getMachineInfo } from "@/server/hardware/machine";

export async function GET() {
  await connection();
  return Response.json(await getMachineInfo());
}
