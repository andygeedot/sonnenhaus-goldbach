// Liest Sunny-Portal-Exporte (data/raw/*.csv) und data/batterie.csv ein und schreibt data/energy.json.
// Aufruf: npm run import:csv
// Monate, die nicht in den CSVs stehen (z. B. von Home Assistant geschickte), bleiben erhalten.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSunnyPortalCsv, parseBatteryCsv, upsertMonth, key } from "./energy-data.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "data", "energy.json");
const rawDir = join(root, "data", "raw");

let data = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { updated: "", months: [] };

// neuester Export gewinnt, falls Jahre doppelt vorkommen
const exports = readdirSync(rawDir).filter(f => f.endsWith(".csv"))
  .map(f => parseSunnyPortalCsv(readFileSync(join(rawDir, f), "utf8")))
  .sort((a, b) => a.exported.localeCompare(b.exported));
const months = new Map();
for (const e of exports) for (const [k, v] of e.months) months.set(k, v);

const battPath = join(root, "data", "batterie.csv");
const batt = existsSync(battPath) ? parseBatteryCsv(readFileSync(battPath, "utf8")) : new Map();

for (const v of months.values()) data = upsertMonth(data, { ...v, ...batt.get(key(v.y, v.m)) });

writeFileSync(out, JSON.stringify(data, null, 1) + "\n");
const f = data.months[0], l = data.months.at(-1);
console.log(`${data.months.length} Monate in data/energy.json (${f.y}-${f.m + 1} bis ${l.y}-${l.m + 1})`);
