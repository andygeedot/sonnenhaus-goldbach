// Die Zeichnung oben: Strom-Linien, Sonne, Sprechblasen, Monats-Regler und die Energiebilanz daneben.
import { AC_FROM, HOUSE, TARIF } from "./config";
import { M, st, yearRows } from "./model";
import { state } from "./state";
import type { Stats } from "./types";
import { $, MON, MONL, count, eur, f0, f1, f2, partial } from "./ui";

const periodRows = () => state.pm == null ? yearRows(state.y) : yearRows(state.y).filter(r => r.m === state.pm);
export const periodName = () => state.pm == null ? `Ganzes Jahr ${state.y}${partial(state.y) ? "*" : ""}` : `${MONL[state.pm]} ${state.y}`;

interface Info { ic: string; c: string; t: string; x: string; f: [string, string][] }

function info(k: string, s: Stats): Info | undefined {
  const p = M.P[state.y], A = M.A, per = state.pm == null ? `im Jahr ${state.y}` : `im ${MONL[state.pm]}`;
  const perDay = (v: number) => f1.format(v / (s.n * 30.4));
  const hasBatt = s.battIn > 0;
  const winter = state.pm != null && [10, 11, 0].includes(state.pm), summer = state.pm != null && [4, 5, 6].includes(state.pm);
  const T: Record<string, Info> = {
    sun: { ic: "☀️", c: "var(--sun)", t: "Die Sonne",
      x: `Sie ist unser Kraftwerk am Himmel, 150 Millionen Kilometer weit weg. Ihr Licht braucht etwa 8 Minuten bis zu unserem Dach. ${winter ? "Im Winter steht sie tief und scheint nur kurz, darum ernten wir wenig." : summer ? "Im Sommer steht sie hoch und scheint bis zu 16 Stunden am Tag!" : "Schieb den Regler und schau, wie sie im Winter tiefer sinkt."}`,
      f: [["Sonnenernte " + per, f0.format(s.pv) + " kWh"], ["pro Tag", perDay(s.pv) + " kWh"], ["reicht für", f0.format(s.pv / 0.015) + " Handy-Ladungen"]] },
    roof: { ic: "🔆", c: "var(--sun)", t: "Unser Solardach",
      x: `Seit März 2019 verwandeln die Solarmodule Sonnenlicht in Strom, ganz ohne Lärm und Abgase. Leistung: ${f2.format(HOUSE.kwp)} kWp. Gekostet hat es 11.500 €.`,
      f: [["geerntet " + per, f0.format(s.pv) + " kWh"], ["pro kWp", f0.format(s.pv / HOUSE.kwp) + " kWh"], ["davon selbst genutzt", f0.format(s.direct / s.pv * 100) + " %"]] },
    batt: { ic: "🔋", c: "var(--battery)", t: "Unsere Batterie",
      x: hasBatt ? "Eine Zendure-Batterie: Mittags füllen wir sie mit Sonnenstrom, abends und nachts holen wir ihn wieder heraus. Seit März 2026 hat sie 5,76 kWh, das reicht für etwa einen halben Tag Strom."
        : "Die gab es zu dieser Zeit noch nicht! Unsere Batterie kam erst im Dezember 2025. Bis dahin ging aller Sonnenstrom, den wir nicht sofort brauchten, ins Netz.",
      f: hasBatt ? [["geladen " + per, f0.format(s.battIn) + " kWh"], ["entladen", f0.format(s.battOut) + " kWh"], ["gespart", eur(s.battGain)]] : [] },
    ac: state.y < AC_FROM.y
      ? { ic: "❄️", c: "var(--heat)", t: "Klimaanlage? Noch nicht!",
          x: "Die Klimaanlage kam erst 2020. Davor heizten wir direkt mit Strom: Da wird aus 1 kWh Strom genau 1 kWh Wärme, wie bei einem Heizlüfter. Die Klimaanlage schafft heute etwa viermal so viel Wärme mit derselben Menge Strom.",
          f: [["Heizstrom " + per + " (geschätzt)", f0.format(s.heat) + " kWh"]] }
      : { ic: "❄️", c: "var(--heat)", t: "Klimaanlage = Wärmepumpe",
          x: `Unsere Mitsubishi Diamond MSZ-LN25 ist eine Luft-Luft-Wärmepumpe: Draußen holt sie Wärme aus der Luft (sogar bei Frost!), drinnen bläst sie warme Luft ins Zimmer. Aus 1 kWh Strom macht sie etwa ${f1.format(A.jaz)} kWh Wärme. Früher, mit Strom-Heizgeräten, war es nur 1 kWh. Im Sommer kühlt sie.`,
          f: [["Heizstrom " + per + " (geschätzt)", f0.format(s.heat) + " kWh"], ["daraus Wärme", "≈ " + f0.format(s.heatUseful) + " kWh"], ["gespart ggü. Strom-Heizung", eur(s.acGain)]] },
    house: { ic: "🏠", c: "var(--home)", t: "Unser Haus in Goldbach",
      x: "74 m², in denen alles mit Strom läuft: Heizung, warmes Wasser (Durchlauferhitzer), Kochen, Licht, Computer und die E-Bikes. Tipp: Tippe auch auf die anderen Dinge im Bild!",
      f: [["Verbrauch " + per, f0.format(s.cons) + " kWh"], ["pro Tag", perDay(s.cons) + " kWh"], ["vom eigenen Dach", f0.format(s.autarky * 100) + " %"]] },
    bike: { ic: "🚲", c: "var(--bike)", t: "Unsere E-Bikes",
      x: `Mit 1 kWh fährt ein E-Bike etwa 80 km weit. 100 km kosten uns so nur rund ${f0.format(100 * A.bikeKwhPerKm * p.strom)} Cent, und wenn die Sonne scheint, laden sie gratis vom Dach.`,
      f: [["Strom für 100 km", "≈ 1,2 kWh"], ["Auto für 100 km", "≈ 7 l Benzin"]] },
    grid: { ic: "🔌", c: "var(--grid)", t: "Das Stromnetz",
      x: `Das Netz verbindet uns mit allen Nachbarn. Wenn wir zu wenig haben (nachts, im Winter), holen wir Strom. Wenn wir zu viel haben (mittags, im Sommer), geben wir ihn ab. ${TARIF[state.y] ? `Unser Strom kommt seit 2026 von ${TARIF[state.y]}, einer Genossenschaft für Ökostrom.` : ""}`,
      f: [["geholt " + per, f0.format(s.imp) + " kWh"], ["gekostet", eur(s.imp * p.strom / 100)], ["abgegeben", f0.format(s.exp) + " kWh"], ["dafür bekommen", eur(s.exp * A.feedIn / 100)]] },
  };
  return T[k];
}

export function renderScene() {
  const rows = periodRows(), s = st(rows), yr = yearRows(state.y);
  const scale = 12 / s.n / 900;
  const w = (v: number) => Math.max(1.5, Math.min(10, v * scale));
  ([["fSun", s.pv], ["fBatt", s.battIn * 6], ["fHeat", s.heat * 3], ["fBike", 600 * s.n / 12], ["fExp", s.exp], ["fImp", s.imp * 2]] as const)
    .forEach(([id, v]) => ($<SVGElement>(id).style.strokeWidth = String(w(v))));
  const hasBatt = s.battIn > 0;
  $<SVGElement>("battGroup").style.opacity = hasBatt ? "1" : "0.25";
  $<SVGElement>("fBatt").style.display = hasBatt ? "" : "none";
  const lvl = Math.min(1, s.battOut / s.cons * 4);
  $("battFill").setAttribute("y", String(20 + 50 * (1 - lvl)));
  $("battFill").setAttribute("height", String(50 * lvl));
  // Sonne steigt mit der Ernte, Wolken im Winter
  const maxPv = Math.max(...yr.map(r => r.pv)), f = state.pm == null ? 0.8 : s.pv / Math.max(maxPv, 1);
  $("sunpos").setAttribute("transform", `translate(105 ${150 - f * 75}) scale(${0.65 + 0.35 * f})`);
  $("smile").setAttribute("d", f > 0.45 ? "M-14 10 Q0 22 14 10" : "M-12 14 Q0 10 12 14");
  $<SVGElement>("cloud2").style.opacity = f < 0.4 ? "1" : "0";
  $<SVGElement>("airflow").style.opacity = s.heat / s.n > 40 ? "1" : "0.15";

  renderBilanz(s);
  $("period").textContent = periodName();
  $("play").textContent = playTimer ? "❚❚" : "▶";

  renderBubble(s);
  if (state.info === "sun") setTimeout(placeBubble, 650); // Sonne wandert noch
}

/** Energiebilanz: Ernte und Verbrauch als Balken im gleichen Maßstab, verbunden durch den selbst genutzten Teil. */
function renderBilanz(s: Stats) {
  count($("sPv"), s.pv); count($("sCons"), s.cons);
  $("blPer").textContent = periodName();
  const max = Math.max(s.pv, s.cons, 1), w = (v: number) => `calc(${(v / max) * 100}% - 2px)`;
  const seg = (v: number, c: string, extra = "") => `<i class="${extra}" style="--c:${c};width:${w(v)}"></i>`;
  $("barPv").innerHTML = seg(s.direct, "var(--sun)") + seg(s.exp, "var(--leaf)");
  $("barUse").innerHTML = seg(s.fromRoof, "var(--sun)") + seg(s.battIn, "var(--battery)") + seg(s.imp, "var(--grid)", "striped");
  const share = s.direct / Math.max(s.pv, 1) * 100;
  $("ribbon").innerHTML = seg(s.fromRoof, "var(--sun)") + (s.battIn > 0 ? seg(s.battIn, "var(--battery)") : "") +
    `<span class="rl">↓ ${f0.format(share)} % der Ernte nutzen wir selbst${s.battIn > 0 ? ", einen Teil davon über die Batterie" : ""}</span>`;
  const item = (c: string, l: string, v: number, cls = "") => `<span class="${cls}" style="--c:${c}">${l} <b>${f0.format(v)}</b></span>`;
  $("legPv").innerHTML = item("var(--sun)", "selbst genutzt", s.direct) + item("var(--leaf)", "an Nachbarn abgegeben", s.exp);
  $("legUse").innerHTML = item("var(--sun)", "direkt vom Dach", s.fromRoof) + (s.battIn > 0 ? item("var(--battery)", "Batterie", s.battIn) : "") +
    item("var(--grid)", "aus dem Netz gekauft", s.imp, "striped");
  const roof = s.fromRoof / s.cons * 100, bat = s.battIn / s.cons * 100;
  $<SVGElement>("gSun").style.strokeDasharray = `${roof} 100`;
  $<SVGElement>("gBatt").style.strokeDasharray = `${bat} 100`;
  $<SVGElement>("gBatt").style.strokeDashoffset = String(-roof);
  $("gPct").textContent = f0.format(s.autarky * 100) + " %";
  $("kMoney").textContent = eur(Math.abs(s.ourCost));
  $("kMoneyL").textContent = s.ourCost < 0 ? "Plus statt Rechnung" : "Energiekosten";
  $("kCo2").textContent = f1.format(s.co2 / 1000) + " t";
}

// ---------- Sprechblase direkt am angeklickten Ding ----------
const hotEl = () => (document.querySelectorAll(`.hot[data-k="${state.info}"]`)[state.hotIdx] ?? document.querySelector(`.hot[data-k="${state.info}"]`)) as Element;

function renderBubble(s?: Stats) {
  const b = $("bubble");
  document.querySelectorAll(".hot").forEach(h => h.classList.toggle("sel", !!state.info && h === hotEl()));
  const I = state.info && s ? info(state.info, s) : undefined;
  if (!I) { b.hidden = true; delete b.dataset.k; return; }
  b.style.setProperty("--c", I.c);
  b.innerHTML = `<button class="close" aria-label="Schließen">×</button>
    <div class="bh"><span class="ic">${I.ic}</span><h3>${I.t}</h3></div><p>${I.x}</p>
    ${I.f.length ? `<div class="facts">${I.f.map(([l, v]) => `<span>${l}<b>${v}</b></span>`).join("")}</div>` : ""}<i class="arrow"></i>`;
  const id = `${state.info}${state.hotIdx}`, fresh = b.hidden || b.dataset.k !== id;
  b.hidden = false;
  if (fresh) { b.style.transition = "none"; b.style.animation = "none"; void b.offsetWidth; b.style.animation = ""; }
  b.dataset.k = id;
  placeBubble();
  if (fresh) { void b.offsetWidth; b.style.transition = ""; }
}

function placeBubble() {
  const b = $("bubble");
  if (b.hidden || !state.info) return;
  const box = $("scenebox").getBoundingClientRect(), r = hotEl().getBoundingClientRect();
  const cx = r.left + r.width / 2 - box.left, cy = r.top + r.height / 2 - box.top;
  const bw = b.offsetWidth, bh = b.offsetHeight, gap = 14;
  let left: number, top: number, side: string;
  if (box.width >= 640) {
    // neben das Ding, zur Bildmitte hin
    side = cx < box.width / 2 ? "l" : "r";
    left = side === "l" ? r.right - box.left + gap : r.left - box.left - bw - gap;
    left = Math.max(8, Math.min(box.width - bw - 8, left));
    top = Math.max(8, Math.min(Math.max(8, box.height - bh - 8), cy - 46));
    b.style.setProperty("--a", Math.max(20, Math.min(bh - 24, cy - top)) + "px");
  } else {
    // schmal: Blase liegt unter dem Bild (CSS), Pfeil zeigt hoch zum Ding
    side = "t"; left = top = 0;
    b.style.setProperty("--a", Math.max(20, Math.min(bw - 24, cx)) + "px");
  }
  b.dataset.side = side;
  b.style.left = left + "px";
  b.style.top = top + "px";
}

function closeBubble() { state.info = null; renderBubble(); }

// ---------- Monats-Regler und Abspielen ----------
export function setupRange() {
  const ms = yearRows(state.y).map(r => r.m), range = $<HTMLInputElement>("monthRange");
  range.max = String(ms.length);
  range.value = String(state.pm == null ? 0 : ms.indexOf(state.pm) + 1);
  $("ticks").innerHTML = `<span>Jahr</span>` + ms.map(m => `<span>${MON[m][0]}</span>`).join("");
}

let playTimer: ReturnType<typeof setInterval> | null = null;
export function stopPlay() {
  if (playTimer) clearInterval(playTimer);
  playTimer = null;
  $("play").textContent = "▶";
}

export function initScene() {
  $("bubble").addEventListener("click", e => { if ((e.target as Element).closest(".close")) closeBubble(); });
  $("scene").addEventListener("click", e => { if (!(e.target as Element).closest(".hot")) closeBubble(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && state.info) closeBubble(); });
  addEventListener("resize", placeBubble);

  $<HTMLInputElement>("monthRange").addEventListener("input", e => {
    const ms = yearRows(state.y).map(r => r.m), v = +(e.target as HTMLInputElement).value;
    state.pm = v === 0 ? null : ms[v - 1];
    renderScene();
  });

  document.querySelectorAll<HTMLElement | SVGElement>(".hot").forEach(h => {
    const pick = () => {
      const k = h.dataset.k!, idx = [...document.querySelectorAll(`.hot[data-k="${k}"]`)].indexOf(h);
      if (state.info === k && state.hotIdx === idx) { closeBubble(); return; }
      state.info = k; state.hotIdx = idx;
      $("scenebox").classList.add("touched");
      renderScene();
    };
    h.addEventListener("click", pick);
    h.addEventListener("keydown", e => { const ke = e as KeyboardEvent; if (ke.key === "Enter" || ke.key === " ") { e.preventDefault(); pick(); } });
  });

  $("play").addEventListener("click", () => {
    if (playTimer) { stopPlay(); return; }
    const ms = yearRows(state.y).map(r => r.m);
    let i = state.pm == null ? 0 : ms.indexOf(state.pm) + 1;
    if (i >= ms.length) i = 0;
    const step = () => {
      if (i >= ms.length) { stopPlay(); state.pm = null; setupRange(); renderScene(); return; }
      state.pm = ms[i++]; setupRange(); renderScene();
    };
    playTimer = setInterval(step, 1300);
    step();
  });
}
