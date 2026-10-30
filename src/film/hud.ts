// Alles, was fest auf dem Bildschirm steht (1920 × 1080): Erzähl-Kasten, Sunny mit Sprechblase,
// Einblendungen, Lautmalereien und die Infoleiste. Texte sind SVG – so sieht es in jedem Browser gleich aus.
import type { Facts } from "../kiosk/facts";
import { MONL, f0 } from "../ui";
import { INK } from "./world";

const O = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const O4 = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** Bricht Text in Zeilen um (Comic-Schrift, grob nach Zeichen gemessen). */
export function wrap(text: string, max: number) {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    if ((line + " " + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + " " + w).trim();
  }
  if (line) out.push(line);
  return out;
}
export const tspans = (lines: string[], x: number, lh: number) =>
  lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : 0}">${esc(l)}</tspan>`).join("");

/** Volti, ein kleines Strom-Männchen, moderiert den Film. */
const volti = `<g id="sunnyFace">
  <path d="M-4 -60 L-30 -116 L-2 -108 L-18 -150 L30 -92 L4 -98 L18 -60Z" fill="#ffd43b" ${O4}/>
  <circle r="66" fill="#ffd43b" ${O}/>
  <path d="M-60 26 Q-92 30 -96 64" fill="none" ${O}/><path d="M60 26 Q92 30 96 64" fill="none" ${O}/>
  <circle cx="-38" cy="18" r="11" fill="#ff9d7a" opacity=".75"/><circle cx="38" cy="18" r="11" fill="#ff9d7a" opacity=".75"/>
  <g class="face"><ellipse class="eye" cx="-21" cy="-10" rx="7.5" ry="11" fill="${INK}"/><ellipse class="eye" cx="21" cy="-10" rx="7.5" ry="11" fill="${INK}"/>
    <path class="mouth" d="M-21 16 Q0 38 21 16" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/></g></g>`;

// ---------- kleine Symbole (ohne Emoji – die fehlen auf manchen Geräten) ----------
const ICON: Record<string, string> = {
  sun: `<circle r="13" fill="#ffd43b" ${O4}/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4; return `<line x1="${Math.cos(a) * 18}" y1="${Math.sin(a) * 18}" x2="${Math.cos(a) * 25}" y2="${Math.sin(a) * 25}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`; }).join("")}`,
  house: `<rect x="-18" y="-4" width="36" height="26" fill="#fffaf0" ${O4}/><polygon points="-24,-2 0,-24 24,-2" fill="#d9603f" ${O4}/>`,
  ring: `<circle r="20" fill="none" stroke="#e1ddd5" stroke-width="9"/><path d="M0 -20 A20 20 0 1 1 -19 6" fill="none" stroke="#3aa35a" stroke-width="9"/>`,
  batt: `<rect x="-14" y="-22" width="28" height="44" rx="6" fill="#e9eef3" ${O4}/><rect x="-8" y="-6" width="16" height="22" rx="3" fill="#2bc4b4"/><rect x="-6" y="-28" width="12" height="6" rx="2" fill="${INK}"/>`,
  plug: `<rect x="-14" y="-12" width="28" height="26" rx="6" fill="#c8cfd8" ${O4}/><line x1="-6" y1="-12" x2="-6" y2="-24" ${O4}/><line x1="6" y1="-12" x2="6" y2="-24" ${O4}/><line x1="0" y1="14" x2="0" y2="24" ${O4}/>`,
};
const icon = (k: string, x: number, y: number) => `<g transform="translate(${x} ${y})">${ICON[k]}</g>`;

/** Infoleiste unten: was gerade los ist – immer sichtbar. */
function infoStrip(f: Facts) {
  const m = f.month, y = f.cur;
  const item = (x: number, k: string, v: string, l: string) => `${icon(k, x + 26, 1011)}
    <text class="iv" x="${x + 62}" y="1012">${v}</text><text class="il" x="${x + 62}" y="1040">${l}</text>`;
  return `<g id="info">
    <rect x="28" y="962" width="1864" height="98" rx="18" fill="#fff" ${O}/>
    <text class="ih" x="56" y="1004">${esc(MONL[m.months[0].m].toUpperCase())} ${f.year}</text><text class="il" x="56" y="1036">dieser Monat</text>
    ${item(250, "sun", `${f0.format(m.pv)} kWh`, "erzeugt")}${item(470, "house", `${f0.format(m.cons)} kWh`, "verbraucht")}
    ${item(690, "ring", `${f0.format(m.autarky * 100)} %`, "autark")}${item(870, "batt", `${f0.format(m.battIn)} kWh`, "in die Batterie")}
    ${item(1100, "plug", `${f0.format(m.imp)} kWh`, "aus dem Netz")}
    <line x1="1318" y1="980" x2="1318" y2="1044" stroke="#e1ddd5" stroke-width="5" stroke-linecap="round"/>
    <text class="ih" x="1342" y="1004">${f.year}</text><text class="il" x="1342" y="1036">bis ${esc(MONL[m.months[0].m])}</text>
    ${item(1440, "sun", `${f0.format(y.pv)} kWh`, "erzeugt")}${item(1665, "ring", `${f0.format(y.autarky * 100)} %`, "autark")}
  </g>`;
}

/** Lautmalerei mit Zackenstern („KLONK!“). */
export function boom(id: string, word: string, x: number, y: number, rot: number, fill = "#ffd43b", size = 70) {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? size * 1.15 : size * 1.75;
    return `${(Math.cos(a) * r * 1.35).toFixed(0)},${(Math.sin(a) * r * .8).toFixed(0)}`;
  }).join(" ");
  return `<g id="${id}" class="boom" transform="translate(${x} ${y}) rotate(${rot})" opacity="0"><g class="bi">
    <polygon points="${pts}" fill="${fill}" ${O}/><text class="bw" y="${size * .32}" font-size="${size}">${esc(word)}</text></g></g>`;
}

/** Einblendung im Comic-Stil (Kasten mit dicker Kontur). */
const panel = (id: string, x: number, y: number, w: number, h: number, inner: string) =>
  `<g id="${id}" class="inset" opacity="0" transform="translate(${x} ${y})"><g class="ii"><rect x="8" y="10" width="${w}" height="${h}" rx="20" fill="${INK}"/>
    <rect width="${w}" height="${h}" rx="20" fill="#fff" ${O}/>${inner}</g></g>`;

export function hudSvg(f: Facts) {
  const ms = f.full.months, maxPv = Math.max(...ms.map(r => r.pv));
  // Kalender + wachsende Säulen für den Zeitraffer
  const yearBars = ms.map((r, i) => {
    const h = r.pv / maxPv * 230;
    return `<rect class="ybar" data-i="${i}" x="${40 + i * 46}" y="${330 - h}" width="34" height="${h}" rx="6" fill="#ffd43b" ${O4} opacity="0"/>
      <text class="yl" x="${57 + i * 46}" y="368">${MONL[r.m][0]}</text>`;
  }).join("");
  return `
  <defs>
    <mask id="irisMask"><rect width="1920" height="1080" fill="#fff"/><circle id="iris" cx="960" cy="540" r="1200" fill="#000"/></mask>
  </defs>
  <rect id="night" width="1920" height="1080" fill="#0b1638" opacity="0"/>
  <g id="stars" opacity="0">${[[240, 380], [520, 330], [860, 420], [1180, 350], [1500, 430], [1700, 360], [700, 520], [1350, 520], [380, 560]].map(([x, y]) =>
    `<path transform="translate(${x} ${y})" d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4Z" fill="#fff6c4"/>`).join("")}</g>
  <g id="rain" opacity="0" stroke="#bcd6f2" stroke-width="5" stroke-linecap="round">${Array.from({ length: 90 }, (_, i) =>
    `<line class="drop" x1="${(i * 97) % 1960}" y1="0" x2="${(i * 97) % 1960 - 14}" y2="44"/>`).join("")}</g>
  <rect id="flash" width="1920" height="1080" fill="#fffbe6" opacity="0"/>
  <g id="snow" opacity="0">${Array.from({ length: 70 }, (_, i) => `<circle class="flake" cx="${(i * 137) % 1920}" cy="0" r="${5 + (i % 4) * 2}" fill="#fff" stroke="#b8c8dc" stroke-width="2"/>`).join("")}</g>

  <!-- Einblendungen (links im Bild) -->
  ${panel("insPv", 60, 360, 600, 300, `${icon("sun", 70, 80)}<text class="pk" x="120" y="92">Unser Dach erntet</text>
    <text class="pbig" x="40" y="200"><tspan id="cntPv">0</tspan><tspan class="pu"> kWh</tspan></text><text class="pt" x="40" y="252">Sonnenstrom pro Jahr – genug für</text><text class="pt" x="40" y="286">${f0.format(Math.round(f.avgPv / .015 / 1000) * 1000)} Handy-Ladungen!</text>`)}
  ${panel("insHP", 60, 330, 640, 420, `<text class="pk" x="32" y="60">So funktioniert's</text>
    <g transform="translate(320 220)"><rect x="-80" y="-65" width="160" height="130" rx="16" fill="#e9eef3" ${O}/><circle cx="-20" cy="0" r="40" fill="#fff" ${O4}/>
      <g class="hpfan" fill="#ff7a45" ${O4}><path d="M-20 0 L-20 -34 Q0 -20 -20 0Z"/><path d="M-20 0 L10 18 Q-10 26 -20 0Z"/><path d="M-20 0 L-50 18 Q-46 -6 -20 0Z"/></g></g>
    <g fill="none" stroke-width="10" stroke-linecap="round"><path class="airIn" d="M40 150 q30 -20 60 0 t60 0 t60 0" stroke="#4c9be0"/><path class="airIn" d="M40 290 q30 -20 60 0 t60 0 t60 0" stroke="#4c9be0"/>
      <path class="airOut" d="M420 150 q30 -20 60 0 t60 0 t60 0" stroke="#ff6a3d"/><path class="airOut" d="M420 290 q30 -20 60 0 t60 0 t60 0" stroke="#ff6a3d"/></g>
    <text class="pt" x="40" y="340">kalte Luft</text><text class="pt" x="470" y="340">warme Luft</text>
    <text class="pbig s" x="320" y="398" text-anchor="middle">1 kWh Strom → 4 kWh Wärme</text>`)}
  ${panel("insNope", 60, 360, 640, 330, `<text class="pk" x="32" y="60">Öl und Gas? Brauchen wir nicht!</text>
    ${[["Öl", 120], ["Gas", 320], ["Strom", 520]].map(([l, x], i) => `<g transform="translate(${x} 170)">
      ${i === 0 ? `<rect x="-42" y="-60" width="84" height="110" rx="10" fill="#4a4f57" ${O}/><line x1="-42" y1="-22" x2="42" y2="-22" ${O4}/><line x1="-42" y1="14" x2="42" y2="14" ${O4}/>`
        : i === 1 ? `<path d="M0 50 C-55 40 -50 -10 -15 -60 C-12 -25 10 -30 8 -55 C45 -20 55 40 0 50Z" fill="#4c9be0" ${O}/>`
        : `<path d="M12 -62 L-30 2 H-2 L-14 52 L32 -14 H4 Z" fill="#ffd43b" ${O}/>`}
      ${i < 2 ? `<g class="cross"><line x1="-60" y1="-70" x2="60" y2="60" stroke="#e8483d" stroke-width="16" stroke-linecap="round"/><line x1="60" y1="-70" x2="-60" y2="60" stroke="#e8483d" stroke-width="16" stroke-linecap="round"/></g>`
        : `<g class="still"><circle cx="42" cy="-48" r="30" fill="#3aa35a" ${O4}/><path d="M28 -48 L38 -37 L57 -60" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>`}
      <text class="pt" y="110" text-anchor="middle">${l}</text></g>`).join("")}`)}
  ${panel("insYear", 60, 340, 640, 400, `<text class="pk" x="32" y="60">Sonnenernte ${f.fullYear}</text>
    <g transform="translate(470 30)"><rect width="140" height="64" rx="12" fill="#e8483d" ${O4}/><text id="calMonth" class="cal" x="70" y="46" text-anchor="middle">Jan</text></g>
    ${yearBars}`)}
  ${panel("insBatt", 60, 360, 640, 330, `<text class="pk" x="32" y="60">Strom vom eigenen Dach</text>
    <g transform="translate(170 190)"><circle r="78" fill="none" stroke="#e1ddd5" stroke-width="26"/><circle id="ringPrev" r="78" fill="none" stroke="#9aa6b2" stroke-width="26" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90)"/>
      <text class="ring" y="16" text-anchor="middle">${f0.format(f.autPrev * 100)} %</text><text class="pt" y="132" text-anchor="middle">${f.year - 1} ohne</text></g>
    <text class="pbig s" x="320" y="208" text-anchor="middle">→</text>
    <g transform="translate(470 190)"><circle r="78" fill="none" stroke="#e1ddd5" stroke-width="26"/><circle id="ringCur" r="78" fill="none" stroke="#3aa35a" stroke-width="26" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90)"/>
      <text class="ring" y="16" text-anchor="middle">${f0.format(f.autCur * 100)} %</text><text class="pt" y="132" text-anchor="middle">${f.year} mit Batterie</text></g>`)}
  ${panel("insCount", 60, 330, 660, 420, `<text class="pk" x="32" y="60">Seit 2019 – gegenüber Gas &amp; ohne Solar</text>
    ${[["cntEur", "gespart", "#3aa35a"], ["cntCo2", "CO₂ vermieden", "#4c9be0"], ["cntPaid", "der Technik wieder drin", "#e8a52d"]].map(([id, l, c], i) =>
      `<g transform="translate(40 ${130 + i * 100})"><circle cx="30" cy="-14" r="30" fill="${c}" ${O4}/><text class="pbig m" x="84" y="6" id="${id}">0</text><text class="pt" x="84" y="40">${l}</text></g>`).join("")}`)}

  ${panel("insWins", 60, 290, 880, 640, `<text class="pk" x="36" y="64">Das bringt unser Sonnenhaus</text>
    ${[["cntW1", "#ffd43b", "%", "unseres Stroms kommt vom eigenen Dach", ""],
       ["cntW2", "#3aa35a", "€", "weniger Energiekosten seit 2019", ""],
       ["cntW3", "#4c9be0", "CO₂", `vermieden – so viel wie ${f0.format(f.trees)} Bäume im Jahr`, ""],
       ["cntW4", "#e8a52d", "✓", "der Technik sind schon wieder drin", ""]].map(([id, c, sym, l1, l2], i) =>
      `<g transform="translate(36 ${118 + i * 132})"><circle cx="52" cy="40" r="48" fill="${c}" ${O}/>
        <text class="sym" x="52" y="${sym === "CO₂" ? 52 : 58}" text-anchor="middle" font-size="${sym === "CO₂" ? 34 : 50}">${sym}</text>
        <text id="${id}" class="pbig w" x="128" y="58">0</text>
        <text class="pt" x="128" y="96">${l1}</text>${l2 ? `<text class="pt" x="128" y="128">${l2}</text>` : ""}</g>`).join("")}`)}
  ${panel("insCta", 60, 240, 880, 630, `<text class="ctaT" x="440" y="84" text-anchor="middle">WERDE AUCH EIN SONNENHAUS!</text>
    ${[["1", "Dach prüfen", "Solarrechner oder Fachbetrieb fragen:", "Wie viel Sonne passt auf dein Dach?"],
       ["2", "Klein anfangen", "Ein Balkonkraftwerk gibt es schon", "ab ein paar hundert Euro."],
       ["3", "Groß denken", "Solar, Speicher und Wärmepumpe:", "Förderung und Angebote vergleichen."]].map(([n, t, l1, l2], i) =>
      `<g transform="translate(40 ${126 + i * 124})"><circle cx="46" cy="44" r="42" fill="#ffd43b" ${O}/><text class="num" x="46" y="62" text-anchor="middle">${n}</text>
        <text class="stepT" x="112" y="38">${t}</text><text class="pt" x="112" y="76">${l1}</text><text class="pt" x="112" y="108">${l2}</text></g>`).join("")}
    <g transform="translate(440 552)"><rect x="-400" y="-46" width="800" height="92" rx="30" fill="#3aa35a" ${O}/>
      <text class="ctaB" y="-6" text-anchor="middle">FRAGEN? SCHREIB UNS!</text>
      <text class="ctaM" y="32" text-anchor="middle">andreas.gerhard@oneguitar.eu</text></g>`)}
  <g id="machmit" opacity="0"><g class="mi" transform="translate(960 520)">
    <polygon points="${Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2, r = i % 2 ? 230 : 330; return `${(Math.cos(a) * r * 1.5).toFixed(0)},${(Math.sin(a) * r * .85).toFixed(0)}`; }).join(" ")}" fill="#e8483d" ${O}/>
    <polygon points="${Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2 + .11, r = i % 2 ? 190 : 270; return `${(Math.cos(a) * r * 1.5).toFixed(0)},${(Math.sin(a) * r * .85).toFixed(0)}`; }).join(" ")}" fill="#ffd43b" ${O}/>
    <text class="mm" y="58" text-anchor="middle">MACH MIT!</text></g></g>
  <g id="booms"></g>

  <!-- Erzähl-Kasten oben links -->
  <g id="cap" opacity="0"><rect id="capShadow" x="50" y="50" width="820" height="200" fill="${INK}"/><rect id="capBg" x="40" y="40" width="820" height="200" fill="#ffe14d" ${O}/>
    <text id="capK" class="ck" x="68" y="92"></text><text id="capT" class="ct" x="68" y="142"></text></g>

  <!-- Sunny moderiert oben rechts -->
  <g id="sayBox" opacity="0"><path id="sayBg" d="" fill="#fff" ${O}/><text id="sayT" class="st" x="0" y="0"></text></g>
  <g transform="translate(1800 262)"><g id="sunnyPos"><g id="sunny">${volti}</g></g></g>

  ${infoStrip(f)}

  <!-- Titel und Abspann -->
  <g id="title" opacity="0"><g class="ti">
    <rect x="390" y="360" width="1140" height="300" rx="30" fill="${INK}" transform="translate(14 16)"/>
    <rect x="390" y="360" width="1140" height="300" rx="30" fill="#ffe14d" ${O}/>
    <text class="tt" x="960" y="490" text-anchor="middle">DAS SONNENHAUS</text>
    <text class="tt2" x="960" y="560" text-anchor="middle">VON GOLDBACH</text>
    <text class="ts" x="960" y="622" text-anchor="middle">Eine kleine Doku über Sonne, Strom und uns</text></g></g>
  <g id="end" opacity="0">
    <rect x="610" y="370" width="700" height="280" rx="30" fill="${INK}" transform="translate(14 16)"/>
    <rect x="610" y="370" width="700" height="280" rx="30" fill="#ffe14d" ${O}/>
    <text class="tt" x="960" y="530" text-anchor="middle">ENDE</text>
    <text id="endSub" class="ts" x="960" y="602" text-anchor="middle">Danke fürs Zuschauen!</text></g>

  <rect id="irisCover" width="1920" height="1080" fill="#0b0f1a" mask="url(#irisMask)"/>
  <g id="readBtn" class="btn" role="button" aria-label="Zu allen Zahlen und Diagrammen" tabindex="0"><g transform="translate(960 918)"><g class="rb">
    <rect x="-236" y="-30" width="472" height="60" rx="30" fill="${INK}" transform="translate(5 6)"/><rect x="-236" y="-30" width="472" height="60" rx="30" fill="#fff" ${O4}/>
    <path d="M-204 -8 L-190 8 L-176 -8" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <text class="rbt" x="18" y="12" text-anchor="middle">ZAHLEN &amp; DIAGRAMME</text></g></g></g>
  <g id="endBtns" opacity="0" style="pointer-events:none;visibility:hidden">
    ${[["againBtn", 730, "NOCHMAL ANSEHEN"], ["endReadBtn", 1190, "ZAHLEN &amp; DIAGRAMME"]].map(([id, x, l]) => `<g id="${id}" class="btn" role="button" tabindex="0"><g transform="translate(${x} 742)">
      <rect x="-200" y="-38" width="400" height="76" rx="38" fill="${INK}" transform="translate(6 7)"/><rect x="-200" y="-38" width="400" height="76" rx="38" fill="${id === "againBtn" ? "#ffd43b" : "#fff"}" ${O}/>
      <text class="rbt" y="13" text-anchor="middle">${l}</text></g></g>`).join("")}</g>
  <g id="soundGate" opacity="0" style="pointer-events:none;visibility:hidden">
    <rect width="1920" height="1080" fill="#0b0f1a" opacity=".35"/>
    <g id="startBtn" class="btn" role="button" aria-label="Film mit Ton starten" tabindex="0"><g transform="translate(960 772)"><g class="sb">
      <rect x="-420" y="-90" width="840" height="180" rx="90" fill="${INK}" transform="translate(10 12)"/>
      <rect x="-420" y="-90" width="840" height="180" rx="90" fill="#ffd43b" ${O}/>
      <circle cx="-300" cy="0" r="58" fill="#fff" ${O}/><path d="M-320 -30 L-270 0 L-320 30Z" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <text class="sgt" x="60" y="-6" text-anchor="middle">FILM STARTEN</text>
      <text class="sgs" x="60" y="44" text-anchor="middle">mit Musik und Ton</text></g></g></g></g>
  <rect x="7" y="7" width="1906" height="1066" fill="none" stroke="${INK}" stroke-width="14"/>
`;
}

