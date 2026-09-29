import { writeFile } from "node:fs/promises";
import { getMachineInfo } from "../src/lib/collect/machine";

const out = process.argv[2] ?? "snapshot.json";
const info = await getMachineInfo();
await writeFile(out, JSON.stringify(info, null, 2));
console.log(`已保存 ${info.system.family || info.system.model} 的硬件快照到 ${out}`);
