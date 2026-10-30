// Schreibt public/lizenzen.txt: Lizenztexte aller Fremdbausteine, die mit der Seite ausgeliefert werden.
// MIT (Chart.js, @kurkle/color) und SIL Open Font License (Schriften) verlangen, dass Hinweis und Lizenz mitgeliefert werden.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const nm = (p) => join(root, "node_modules", p);
const version = (pkg) => JSON.parse(readFileSync(nm(`${pkg}/package.json`), "utf8")).version;

const parts = [
  ["Chart.js", "chart.js", "chart.js/LICENSE.md"],
  ["@kurkle/color (Teil von Chart.js)", "@kurkle/color", "@kurkle/color/LICENSE.md"],
  ["Schrift Fredoka", "@fontsource/fredoka", "@fontsource/fredoka/LICENSE"],
  ["Schrift Nunito", "@fontsource/nunito", "@fontsource/nunito/LICENSE"],
  ["Schrift Bangers", "@fontsource/bangers", "@fontsource/bangers/LICENSE"],
  ["Schrift Comic Neue", "@fontsource/comic-neue", "@fontsource/comic-neue/LICENSE"],
];

let out = `Verwendete Software und Schriften – Lizenzhinweise
Unser Sonnenhaus in Goldbach (privates Freizeitprojekt)

Zeichnungen, Film, Texte und Musik dieser Seite sind selbst gemacht.
Folgende fremde Bausteine werden mit der Seite ausgeliefert:

GSAP ${version("gsap")} (GreenSock), Animationen
  Lizenz: GreenSock Standard "No Charge" License, https://gsap.com/standard-license
`;
for (const [name, pkg, file] of parts) {
  out += `\n${"=".repeat(72)}\n${name} ${version(pkg)}\n${"=".repeat(72)}\n\n${readFileSync(nm(file), "utf8").trim()}\n`;
}
writeFileSync(join(root, "public", "lizenzen.txt"), out);
console.log("public/lizenzen.txt geschrieben");
