// Übernimmt die Monatswerte, die Home Assistant schickt, in data/energy.json.
// Läuft in GitHub Actions; die Werte kommen als JSON in der Umgebungsvariable PAYLOAD
// (oder als Datei: node scripts/merge-month.mjs werte.json).
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePayload, upsertMonth, withHeatTopup } from "./energy-data.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "data", "energy.json");

const raw = process.argv[2] ? readFileSync(process.argv[2], "utf8") : process.env.PAYLOAD;
if (!raw) { console.error("Keine Werte: PAYLOAD setzen oder Datei angeben."); process.exit(1); }

const v = withHeatTopup(validatePayload(JSON.parse(raw)));
const data = upsertMonth(JSON.parse(readFileSync(file, "utf8")), v);
writeFileSync(file, JSON.stringify(data, null, 1) + "\n");
const saved = data.months.find(r => r.y === v.y && r.m === v.m);
console.log(`Monat ${v.m + 1}/${v.y} übernommen: PV ${v.pv} · Bezug ${v.imp} · Einspeisung ${v.exp} kWh` +
  (saved.heat != null ? ` · Klima: Heizen ${saved.heat}, Kühlen ${saved.cool ?? 0} kWh` : ""));
