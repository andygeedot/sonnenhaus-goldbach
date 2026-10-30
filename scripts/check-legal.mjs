// Verhindert, dass die Seite mit unvollständigem Impressum oder Datenschutz veröffentlicht wird.
// Lokal nur eine Warnung, in der Veröffentlichung (CI) ein Abbruch.
import { readFileSync } from "node:fs";

const open = ["impressum.html", "datenschutz.html"]
  .filter(f => readFileSync(new URL(`../${f}`, import.meta.url), "utf8").includes("BITTE ERGÄNZEN"));

if (open.length) {
  const msg = `Platzhalter „BITTE ERGÄNZEN“ in: ${open.join(", ")}`;
  if (process.env.CI) { console.error(`✖ ${msg} – Veröffentlichung abgebrochen.`); process.exit(1); }
  console.warn(`⚠ ${msg} (lokal nur Warnung)`);
}
