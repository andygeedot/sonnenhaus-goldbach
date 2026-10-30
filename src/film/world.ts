// Die Comic-Welt, durch die die Kamera fährt. Koordinaten in „Welt-Pixeln“: Boden bei y = 900, unser Haus bei x = 1500.
// Alles hat dicke dunkle Konturen und flache, kräftige Farben – wie in einem Kinder-Comic.

export const INK = "#1d2330";
const O = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
const O4 = `stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;

/** Gesicht für Sonne und Strom-Männchen. */
const face = (r: number, cls = "") => `<g class="${cls}">
  <ellipse class="eye" cx="${-r * .32}" cy="${-r * .12}" rx="${r * .1}" ry="${r * .14}" fill="${INK}"/>
  <ellipse class="eye" cx="${r * .32}" cy="${-r * .12}" rx="${r * .1}" ry="${r * .14}" fill="${INK}"/>
  <path class="mouth" d="M${-r * .32} ${r * .22} Q0 ${r * .52} ${r * .32} ${r * .22}" fill="none" stroke="${INK}" stroke-width="${Math.max(3, r * .08)}" stroke-linecap="round"/></g>`;

export function sunSvg(r: number, id: string) {
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2, r1 = r * 1.22, r2 = r * (i % 2 ? 1.5 : 1.62);
    return `<path d="M${(Math.cos(a - .09) * r1).toFixed(1)} ${(Math.sin(a - .09) * r1).toFixed(1)} L${(Math.cos(a) * r2).toFixed(1)} ${(Math.sin(a) * r2).toFixed(1)} L${(Math.cos(a + .09) * r1).toFixed(1)} ${(Math.sin(a + .09) * r1).toFixed(1)}Z" fill="#ffc83d" ${O4}/>`;
  }).join("");
  return `<g id="${id}"><g class="rays">${rays}</g><circle r="${r}" fill="#ffd43b" ${O}/><circle cx="${-r * .55}" cy="${r * .25}" r="${r * .16}" fill="#ff9d7a" opacity=".7"/><circle cx="${r * .55}" cy="${r * .25}" r="${r * .16}" fill="#ff9d7a" opacity=".7"/>${face(r, "face")}</g>`;
}

/** Strom-Männchen: kleine Punkte mit Augen, die an den Leitungen entlanglaufen. */
export const stromi = (color: string) => `<g class="stromi"><circle r="15" fill="${color}" stroke="${INK}" stroke-width="4"/>
  <circle cx="-5" cy="-3" r="2.6" fill="${INK}"/><circle cx="5" cy="-3" r="2.6" fill="${INK}"/></g>`;

/**
 * Eine niedliche Katze (Ursprung: Mitte unten) in fünf Haltungen, zwischen denen der Film überblendet:
 * sitzend (.csit), zusammengerollt (.clie), laufend von der Seite (.cside, Beine .lf1 .lf2 .lb1 .lb2),
 * Katzenbuckel (.carch) und Vorwärtsstrecken (.cbow). Seitenansichten schauen nach links (−x).
 * Dazu im Sitzen Gähn-Maul (.cyawn) und geschlossene Augen (.csleep). Schwarze Katzen haben gelbgrüne Augen.
 */
const cat = (id: string, x: number, y: number, s: number, fur: string, belly: string, o: { flip?: boolean; tabby?: boolean } = {}) => {
  const dark = fur === CAT_BLACK, line = dark ? "#c9ced6" : INK, stripe = "#6e4520";
  const paw = belly === CAT_BLACK ? fur : belly;
  const st = (d: string, w = 4) => o.tabby ? `<path d="${d}" fill="none" stroke="${stripe}" stroke-width="${w}" stroke-linecap="round"/>` : "";
  const thick = (d: string, w: number, cls = "") => `<g class="${cls}"><path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 8}" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="${fur}" stroke-width="${w}" stroke-linecap="round"/></g>`;
  // großer runder Kopf (Mitte 0,0, Radius 29): Ohren, Glanzaugen, Bäckchen, ω-Mäulchen
  const eye = (cx: number) => dark
    ? `<ellipse cx="${cx}" cy="-1" rx="8" ry="9.5" fill="#d4e85a" stroke="${INK}" stroke-width="2"/><ellipse cx="${cx}" cy="-1" rx="4" ry="7.5" fill="${INK}"/>
       <circle cx="${cx + 2.6}" cy="-4.5" r="2.6" fill="#fff"/><circle cx="${cx - 2.4}" cy="3.5" r="1.2" fill="#fff"/>`
    : `<ellipse cx="${cx}" cy="-1" rx="7" ry="8.5" fill="${INK}"/><circle cx="${cx + 2.4}" cy="-4.5" r="2.8" fill="#fff"/><circle cx="${cx - 2.2}" cy="3" r="1.3" fill="#fff"/>`;
  const head = (cx: number, cy: number, k: number, mood: "open" | "happy" | "sleep", extra = "") => `
    <g transform="translate(${cx} ${cy}) scale(${k})"><g class="${extra}">
     <path d="M-26 -10 Q-32 -44 -5 -27Z" fill="${fur}" ${O4}/><path d="M26 -10 Q32 -44 5 -27Z" fill="${fur}" ${O4}/>
     <path d="M-21 -16 Q-25 -36 -10 -26Z" fill="#f7a1b0"/><path d="M21 -16 Q25 -36 10 -26Z" fill="#f7a1b0"/>
     <circle r="29" fill="${fur}" ${O4}/>${st("M-7 -27 L-5 -18 M0 -28.5 L0 -19 M7 -27 L5 -18")}
     ${mood === "open" ? `<g class="ceyes">${eye(-11)}${eye(11)}</g>
       <g class="csleep" opacity="0"><path d="M-17 -1 q6 5 12 0 M5 -1 q6 5 12 0" fill="none" stroke="${line}" stroke-width="3.2" stroke-linecap="round"/></g>`
     : mood === "happy" ? `<path d="M-17 1 q6 -7 12 0 M5 1 q6 -7 12 0" fill="none" stroke="${line}" stroke-width="3.4" stroke-linecap="round"/>`
     : `<path d="M-17 -1 q6 5 12 0 M5 -1 q6 5 12 0" fill="none" stroke="${line}" stroke-width="3.4" stroke-linecap="round"/>`}
     <ellipse cx="-19" cy="9" rx="6.5" ry="3.8" fill="#ff8fa8" opacity=".6"/><ellipse cx="19" cy="9" rx="6.5" ry="3.8" fill="#ff8fa8" opacity=".6"/>
     <ellipse cx="0" cy="6" rx="3.8" ry="2.7" fill="#f28b9b"/>
     <path d="M0 8.5 Q-3 13.5 -7 10.5 M0 8.5 Q3 13.5 7 10.5" fill="none" stroke="${dark ? "#8a8f99" : INK}" stroke-width="2.4" stroke-linecap="round"/>
     ${mood === "open" ? `<g class="cyawn" opacity="0"><ellipse cx="0" cy="14" rx="7" ry="8.5" fill="#b0294f" stroke="${INK}" stroke-width="2.4"/><circle cx="0" cy="18" r="3.5" fill="#f28b9b"/></g>` : ""}
     <path d="M-15 6 L-33 3 M-15 10 L-32 13 M15 6 L33 3 M15 10 L32 13" stroke="${line}" stroke-width="1.8" stroke-linecap="round"/></g></g>`;
  // Bein mit Pfote (Ursprung oben, schwingt beim Laufen um die Hüfte)
  const leg = (cls: string, lx: number, ly: number, len: number, shade = false) => `<g transform="translate(${lx} ${ly})"><g class="${cls}">
    <rect x="-6" y="-2" width="12" height="${len + 2}" rx="6" fill="${fur}" ${O4}/>${shade ? `<rect x="-4" y="0" width="8" height="${len - 4}" rx="4" fill="#000" opacity=".12"/>` : ""}
    <ellipse cx="0" cy="${len}" rx="8" ry="4.5" fill="${paw}" ${O4}/></g></g>`;
  return `
  <g transform="translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})"><g id="${id}" class="cat">
   <g class="csit">
    <g class="ctail">${thick("M16 -10 Q52 -8 48 -42 Q46 -62 32 -64", 8)}${st("M40 -17 v7 M45 -33 h7 M40 -59 l5 6", 3.5)}</g>
    <ellipse cx="0" cy="-28" rx="26" ry="28" fill="${fur}" ${O4}/><ellipse cx="0" cy="-20" rx="13" ry="16" fill="${belly}"/>
    ${st("M-22 -40 q7 4 11 0 M-24 -27 q7 4 11 0 M22 -40 q-7 4 -11 0 M24 -27 q-7 4 -11 0")}
    ${head(0, -74, 1, "open", "chead")}
    <ellipse cx="-11" cy="-3" rx="9.5" ry="6" fill="${paw}" ${O4}/><ellipse cx="11" cy="-3" rx="9.5" ry="6" fill="${paw}" ${O4}/>
    <path d="M-13 -6 v4 M-9 -6 v4 M9 -6 v4 M13 -6 v4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
   </g>
   <g class="clie" opacity="0">
    ${thick("M44 -10 Q70 -6 62 -30 Q56 -44 40 -38", 7)}
    <ellipse cx="6" cy="-21" rx="48" ry="21" fill="${fur}" ${O4}/>
    ${st("M-6 -39 q4 9 0 16 M10 -41 q4 9 0 16 M26 -37 q3 8 0 14")}
    ${head(-36, -30, .72, "sleep")}
    <ellipse cx="-24" cy="-4" rx="11" ry="5.5" fill="${paw}" ${O4}/>
   </g>
   <g class="cside" opacity="0">
    <g class="ctail">${thick("M30 -42 Q58 -46 56 -74 Q55 -88 44 -90", 8)}</g>
    ${leg("lf2", -12, -32, 30, true)}${leg("lb2", 30, -32, 30, true)}
    <g class="cbody"><ellipse cx="4" cy="-40" rx="38" ry="20" fill="${fur}" ${O4}/><ellipse cx="0" cy="-30" rx="22" ry="8" fill="${belly}"/>
     ${st("M-4 -58 q3 8 0 14 M10 -59 q3 8 0 14 M24 -56 q3 7 0 12")}
     ${head(-40, -62, .8, "open")}</g>
    ${leg("lf1", -24, -32, 30)}${leg("lb1", 20, -32, 30)}
   </g>
   <g class="carch" opacity="0">
    ${thick("M30 -52 Q44 -90 32 -114", 10, "ctail")}
    ${leg("", -24, -42, 40, true)}${leg("", 28, -42, 40, true)}
    ${thick("M-26 -44 Q2 -96 30 -44", 34)}${st("M-8 -78 l4 10 M4 -82 l2 10 M16 -78 l-2 10")}
    ${leg("", -16, -42, 40)}${leg("", 20, -42, 40)}
    ${head(-36, -48, .74, "happy")}
   </g>
   <g class="cbow" opacity="0">
    ${thick("M32 -54 Q58 -80 44 -108", 8, "ctail")}
    ${leg("", 28, -46, 44, true)}
    ${thick("M-34 -20 Q0 -30 28 -48", 30)}${st("M-8 -40 l3 10 M6 -45 l3 10 M18 -50 l3 9")}
    ${leg("", 20, -46, 44)}
    <g transform="translate(-30 -12) rotate(90)">${leg("", 0, 0, 42, true)}</g><g transform="translate(-30 -6) rotate(90)">${leg("", 0, 0, 46)}</g>
    ${head(-44, -26, .72, "happy")}
   </g></g></g>`;
};
const CAT_BLACK = "#2a2d34";

/** Ein Comic-Auto (Ursprung: Mitte unten); das E-Auto hat Stecker-Symbol und keinen Auspuff. */
const car = (id: string, color: string, electric: boolean) => `
  <g id="${id}">
    <path d="M-170 -40 Q-170 -78 -130 -84 L-90 -86 Q-62 -142 -6 -146 L60 -146 Q110 -142 132 -92 L160 -86 Q186 -80 186 -46 L186 -26 Q186 -14 172 -14 L-158 -14 Q-170 -14 -170 -26Z" fill="${color}" ${O}/>
    <path d="M-72 -90 Q-50 -130 -6 -132 L50 -132 Q90 -128 108 -92Z" fill="#cfe8fb" ${O4}/><line x1="20" y1="-132" x2="20" y2="-90" stroke="${INK}" stroke-width="4"/>
    <circle cx="-100" cy="-14" r="34" fill="#3a3f4a" ${O}/><circle cx="-100" cy="-14" r="13" fill="#c8cfd8" ${O4}/>
    <circle cx="116" cy="-14" r="34" fill="#3a3f4a" ${O}/><circle cx="116" cy="-14" r="13" fill="#c8cfd8" ${O4}/>
    <circle cx="176" cy="-60" r="9" fill="#fff36b" ${O4}/>
    ${electric
      ? `<g transform="translate(-20 -60)"><circle r="22" fill="#fff" ${O4}/><path d="M4 -14 L-8 2 H2 L-4 14 L10 -4 H0Z" fill="#ffd43b" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`
      : `<rect x="-188" y="-34" width="22" height="10" rx="4" fill="#5b6773" ${O4}/><g class="smoke" fill="#b7bcc4" ${O4}><circle cx="-214" cy="-34" r="12"/><circle cx="-240" cy="-48" r="16"/><circle cx="-272" cy="-64" r="20"/></g>`}
  </g>`;

/** Kleines Haus für die Nachbarn und das Dorf. */
const smallHouse = (x: number, s: number, wall: string, roof: string, id = "") => `
  <g transform="translate(${x} 900) scale(${s})">
    <rect x="-110" y="-160" width="220" height="160" fill="${wall}" ${O}/>
    <polygon points="-135,-150 0,-260 135,-150" fill="${roof}" ${O}/>
    <rect class="${id}" x="-75" y="-120" width="50" height="44" rx="4" fill="#c8cfd8" ${O4}/>
    <rect class="${id}" x="25" y="-120" width="50" height="44" rx="4" fill="#c8cfd8" ${O4}/>
    <rect x="-22" y="-70" width="44" height="70" fill="#9a6b4f" ${O4}/></g>`;

const tree = (x: number, y: number, s: number) => `<g class="tree" data-x="${x}" data-y="${y}" data-s="${s.toFixed(2)}">
  <rect x="-9" y="-40" width="18" height="44" fill="#8a5a3b" ${O4}/>
  <circle cx="0" cy="-78" r="46" fill="#4cae5e" ${O4}/><circle cx="-30" cy="-52" r="30" fill="#5cc06c" ${O4}/><circle cx="30" cy="-56" r="28" fill="#43a356" ${O4}/></g>`;

/** Die Solarmodule, in 6 Stücke geteilt, damit sie nacheinander aufs Dach fallen können. */
function panels() {
  // Dachfläche (relativ zum Haus): oben y −462, x ±150; unten y −305, x ±225
  const at = (u: number, v: number) => { const y = -462 + v * 157, w = 150 + v * 75; return [(-w + u * 2 * w).toFixed(1), y.toFixed(1)]; };
  let out = "";
  for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
    const u0 = col / 3 + .012, u1 = (col + 1) / 3 - .012, v0 = row / 2 + .03, v1 = (row + 1) / 2 - .03;
    const p = [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)].map(q => q.join(",")).join(" ");
    const mid = at((u0 + u1) / 2, v0), midB = at((u0 + u1) / 2, v1);
    out += `<g class="panel"><polygon points="${p}" fill="#2f5a92" ${O4}/><line x1="${mid[0]}" y1="${mid[1]}" x2="${midB[0]}" y2="${midB[1]}" stroke="#8fb8ea" stroke-width="3"/></g>`;
  }
  return out;
}

export function worldSvg(treeCount: number) {
  // Bäume auf den Hügeln: links vom Dorf bis rechts hinter die Nachbarn, das Haus bleibt frei
  const trees: string[] = [];
  for (let i = 0; i < treeCount; i++) {
    const t = i / Math.max(1, treeCount - 1);
    let x = -700 + t * 4300 + ((i * 47) % 60) - 30;
    if (x > 1150 && x < 1900) x += 820;              // nicht vors Haus
    const y = 760 + Math.sin(x / 300) * 30 + ((i * 31) % 40);
    trees.push(tree(x, y, .55 + ((i * 13) % 9) / 22));
  }
  return `
  <defs>
    <pattern id="halftone" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="11" cy="11" r="3.4" fill="#fff" opacity=".22"/></pattern>
  </defs>
  <rect id="sky" x="-3000" y="-2000" width="9000" height="3200" fill="#b8c4cf"/>
  <rect x="-3000" y="-2000" width="9000" height="3200" fill="url(#halftone)"/>
  <!-- Regenbogen (nach dem Gewitter) -->
  <g id="rainbow" opacity="0" fill="none" stroke-width="22">
    ${["#e8483d", "#f59b3b", "#ffd43b", "#5cc06c", "#4c9be0", "#7a5bd6"].map((c, i) => `<path d="M${380 + i * 22} 900 A${900 - i * 22} ${700 - i * 22} 0 0 1 ${2180 - i * 22} 900" stroke="${c}"/>`).join("")}
  </g>

  <g id="wsunpos">${sunSvg(110, "wsun")}</g>
  <g class="cloud" id="cloud1" fill="#fff" ${O4}><path d="M600 260 q-70 0 -70 -55 q0 -60 70 -60 q30 -60 105 -40 q60 -40 115 20 q70 0 70 65 q0 70 -75 70Z"/></g>
  <g class="cloud" id="cloud2" fill="#fff" ${O4}><path d="M2500 200 q-60 0 -60 -45 q0 -50 60 -50 q25 -50 90 -34 q50 -34 98 16 q60 0 60 56 q0 57 -64 57Z"/></g>

  <!-- ferne Hügel mit Goldbach -->
  <path d="M-3000 800 Q-1600 620 -300 760 Q500 640 1300 740 Q2100 640 2900 730 Q3800 640 6000 760 V1200 H-3000Z" fill="#a9db8e" ${O}/>
  <g opacity=".95">
    ${smallHouse(-250, .55, "#f3e3c8", "#c66c52")}${smallHouse(-60, .48, "#efe9df", "#9b5a46")}${smallHouse(130, .52, "#f6dcc2", "#b8604a")}
    <g transform="translate(330 900) scale(.55)"><rect x="-55" y="-420" width="110" height="420" fill="#efe4d4" ${O}/><polygon points="-70,-410 0,-560 70,-410" fill="#7d4a3a" ${O}/>
      <circle cy="-330" r="26" fill="#fff" ${O4}/><path d="M0 -330 V-348 M0 -330 H12" stroke="${INK}" stroke-width="4"/></g>
    ${smallHouse(520, .5, "#f3e3c8", "#a95b45")}
  </g>
  <g id="trees">${trees.join("")}</g>

  <!-- Gewitterwolken und Blitz (fahren für die Wetter-Szene herein) -->
  <g id="storm">
    <g id="bolt" opacity="0"><path d="M940 250 L860 480 L930 480 L840 770 L1020 410 L950 410 L1020 250Z" fill="#fff36b" ${O}/></g>
    <g fill="#5d6675" ${O}>
      <path d="M1250 330 q-110 0 -110 -85 q0 -95 110 -95 q50 -95 165 -62 q95 -62 180 30 q110 0 110 100 q0 112 -118 112Z"/>
      <path d="M1640 280 q-90 0 -90 -70 q0 -78 90 -78 q40 -78 135 -50 q78 -50 148 25 q90 0 90 82 q0 91 -97 91Z"/>
      <path d="M1880 380 q-80 0 -80 -62 q0 -70 80 -70 q36 -70 120 -45 q70 -45 132 22 q80 0 80 74 q0 81 -86 81Z"/></g>
  </g>

  <!-- Boden -->
  <path d="M-3000 900 Q1500 860 6000 900 V2000 H-3000Z" fill="#8fd16e" ${O}/>
  <path d="M-3000 980 Q1500 950 6000 980" fill="none" stroke="#7cc25c" stroke-width="10" stroke-linecap="round"/>
  <g id="snowGround" opacity="0"><path d="M-3000 900 Q1500 860 6000 900 V935 Q1500 895 -3000 935Z" fill="#fff" ${O4}/></g>

  <!-- Strommast und Leitungen -->
  <g ${O} fill="none">
    <line x1="2150" y1="900" x2="2150" y2="470"/><line x1="2090" y1="500" x2="2210" y2="500"/><line x1="2105" y1="550" x2="2195" y2="550"/>
    <line x1="2150" y1="600" x2="2100" y2="900"/><line x1="2150" y1="600" x2="2200" y2="900"/></g>
  <path id="wireHouse" d="M2090 500 Q1920 560 1735 640" fill="none" stroke="${INK}" stroke-width="5"/>
  <!-- Freileitung vom Mast von Dachspitze zu Dachspitze über alle drei Nachbarhäuser (Spitzen: 2470/739, 2720/757, 2950/744) -->
  <path id="wireNb" d="M2210 500 Q2330 640 2470 739 Q2595 800 2720 757 Q2835 800 2950 744" fill="none" stroke="${INK}" stroke-width="5"/>

  <!-- Nachbarn -->
  ${smallHouse(2470, .62, "#fdf3e1", "#d07a5e", "nw")}${smallHouse(2720, .55, "#eef2f7", "#8e6a9e", "nw")}${smallHouse(2950, .6, "#f8e7d0", "#5f8fb5", "nw")}

  <!-- Unser Haus -->
  <g transform="translate(1500 900)">
    <rect x="-230" y="-300" width="460" height="300" rx="6" fill="#fffaf0" ${O}/>
    <polygon points="-275,-290 -170,-482 170,-482 275,-290" fill="#d9603f" ${O}/>
    <g id="panels">${panels()}</g>
    <g id="snowRoof" opacity="0"><path d="M-268 -292 L-166 -478 L166 -478 L268 -292 L250 -300 L156 -462 L-156 -462 L-250 -300Z" fill="#fff" ${O4}/></g>
    <rect class="win" x="-180" y="-230" width="110" height="90" rx="8" fill="#ffe08a" ${O}/>
    <rect class="win" x="70" y="-230" width="110" height="90" rx="8" fill="#ffe08a" ${O}/>
    <line x1="-125" y1="-230" x2="-125" y2="-140" stroke="${INK}" stroke-width="5"/><line x1="125" y1="-230" x2="125" y2="-140" stroke="${INK}" stroke-width="5"/>
    <rect x="-45" y="-150" width="90" height="150" rx="8" fill="#b4573a" ${O}/><circle cx="25" cy="-72" r="7" fill="#ffd43b" ${O4}/>
    <g id="acIn"><rect x="40" y="-282" width="170" height="40" rx="12" fill="#fff" ${O4}/><line x1="58" y1="-256" x2="192" y2="-256" stroke="${INK}" stroke-width="3"/>
      <g id="warmAir" fill="none" stroke="#ff7a45" stroke-width="6" stroke-linecap="round"><path d="M70 -232 q12 16 0 32"/><path d="M125 -232 q12 16 0 32"/><path d="M180 -232 q12 16 0 32"/></g></g>
  </g>

  <!-- Batterie, Klimaanlage außen, E-Bike -->
  <g id="battery" transform="translate(1180 900)">
    <rect x="-22" y="-188" width="44" height="22" rx="5" fill="#5b6773" ${O4}/>
    <rect x="-55" y="-172" width="110" height="172" rx="16" fill="#e9eef3" ${O}/>
    <rect id="bfill" x="-40" y="-155" width="80" height="140" rx="8" fill="#2bc4b4" ${O4}/>
    <path d="M6 -128 L-18 -82 H2 L-8 -40 L22 -96 H2 Z" fill="#fff" ${O4}/></g>
  <g id="acOut" transform="translate(1820 900)">
    <rect x="-80" y="-130" width="160" height="130" rx="16" fill="#e9eef3" ${O}/>
    <circle cx="-20" cy="-65" r="44" fill="#fff" ${O}/>
    <g id="fan" fill="#ff7a45" ${O4}><path d="M-20 -65 L-20 -102 Q0 -88 -20 -65Z"/><path d="M-20 -65 L12 -46 Q-10 -36 -20 -65Z"/><path d="M-20 -65 L-52 -46 Q-48 -70 -20 -65Z"/></g>
    <rect x="38" y="-100" width="28" height="9" rx="4" fill="${INK}"/><rect x="38" y="-78" width="28" height="9" rx="4" fill="${INK}"/><rect x="38" y="-56" width="28" height="9" rx="4" fill="${INK}"/></g>
  <g id="bike">
    <g fill="none" stroke="#7a5bd6" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
      <circle id="wheel1" cx="-75" cy="-42" r="42" stroke="${INK}" stroke-width="8"/><circle id="wheel2" cx="75" cy="-42" r="42" stroke="${INK}" stroke-width="8"/>
      <path d="M-75 -42 L-30 -110 L40 -110 L75 -42 M-30 -110 L0 -42 L40 -110 M0 -42 L-75 -42 M40 -110 L32 -140 L58 -140 M-40 -126 L-16 -126"/></g>
    <rect x="-10" y="-104" width="34" height="18" rx="5" fill="#2bc4b4" ${O4}/></g>

  <!-- Autos: das alte mit Benzin und das kommende Elektroauto -->
  ${car("oldCar", "#c65a4a", false)}${car("eCar", "#3aa3c8", true)}

  <!-- Unsere drei Katzen -->
  ${cat("cat1", 1376, 760, .9, CAT_BLACK, CAT_BLACK)}
  ${cat("cat2", 1600, 900, 1, CAT_BLACK, "#ffffff", { flip: true })}
  ${cat("cat3", 1320, 900, .95, "#b07a42", "#ead2a8", { tabby: true })}

  <!-- „Zzz“ über schlafenden Katzen -->
  ${([["zzz1", 1376, 640], ["zzz1b", 1630, 640], ["zzz2", 1600, 780], ["zzz3", 1320, 785]] as const).map(([id, x, y]) =>
    `<g id="${id}" class="zzz" transform="translate(${x} ${y})" opacity="0">${["z", "z", "Z"].map((z, i) =>
      `<text class="zz" x="${10 + i * 16}" y="${-i * 22}" font-size="${26 + i * 8}" fill="#fff" stroke="${INK}" stroke-width="5" paint-order="stroke">${z}</text>`).join("")}</g>`).join("")}

  <!-- Wege der Strom-Männchen -->
  <g fill="none" stroke="none">
    <path id="pGrid" d="M2150 470 Q1930 540 1735 640 Q1640 690 1560 780"/>
    <path id="pSun" d="M1610 380 Q1580 420 1530 480"/>
    <path id="pRoof" d="M1450 520 L1450 800"/>
    <path id="pExp" d="M1735 640 Q1920 560 2090 500 L2210 500 Q2330 640 2470 739 Q2595 800 2720 757 Q2835 800 2950 744"/>
    <path id="pBattIn" d="M1300 560 Q1210 600 1185 730"/>
    <path id="pBattOut" d="M1235 820 Q1300 790 1400 800"/>
  </g>
  <g id="streams"></g>`;
}
