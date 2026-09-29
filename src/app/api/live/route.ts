import { connection } from "next/server";
import { getLiveStats } from "@/lib/collect/live";

export async function GET() {
  await connection();
  return Response.json(await getLiveStats(), { headers: { "Cache-Control": "no-store" } });
}
