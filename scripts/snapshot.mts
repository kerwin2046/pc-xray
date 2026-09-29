import { writeFile } from "node:fs/promises";
import { getMachineInfo } from "../src/server/hardware/machine";

const out = process.argv[2] ?? "snapshot.json";
const info = await getMachineInfo();
await writeFile(out, JSON.stringify(info, null, 2));
console.log(`Saved hardware snapshot of ${info.system.family || info.system.model} to ${out}`);
