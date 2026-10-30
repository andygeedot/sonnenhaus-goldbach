// Die Abschnitte unter der Zeichnung: Verbrauch, Autarkie, Batterie, Jahreslauf, Geld, Amortisation, Klima.
import { Chart, registerables } from "chart.js";
import { acAdvantage, after, toHundred } from "./calc";
import { AC_FROM, HOUSE, INVEST, REFS, TARIF } from "./config";
import { BATT_START, DATA, FIRST, FULL_YEARS, LAST, M, YEARS, st, yearRows } from "./model";
import { app, state } from "./state";
import type { Month, RefKey, Stats } from "./types";
import { $, MON, MONL, count, eur, f0, f1, f2, reduced, setAll, yLabel } from "./ui";

Chart.register(...registerables);

// ---------- Verbrauch ----------
export function renderCats(s: Stats) {
  const A = M.A;
  $("split").innerHTML = ([["heat", "var(--heat)"], ["home", "var(--home)"]] as const)
    .map(([k, c]) => `<div style="flex:${s[k]};background:${c}" title="${f0.format(s[k])} kWh"></div>`).join("");
  count($("cHeat"), s.heat); count($("cHome"), s.home);
  const pct = (v: number) => `${f0.format(v / s.cons * 100)} % von allem`;
  $("cHeatS").textContent = pct(s.heat); $("cHomeS").textContent = pct(s.home);
  $("cHomeDay").textContent = f1.format(s.home / (s.n * 30.4));
  $("cHomePP").textContent = f0.format(s.home / HOUSE.people * 12 / s.n);
  $("cBikeCt").textContent = f0.format(100 * A.bikeKwhPerKm * M.P[s.y].strom);
  $("cHeatM2").textContent = f0.format(s.heatUseful / HOUSE.area * 12 / s.n);
  $("cHeatBefore").style.display = s.y < AC_FROM.y ? "" : "none";
  setAll(".jaz", f1.format(A.jaz));
}

// ---------- 100 Kugeln ----------
export function renderDots(s: Stats) {
  // Batterie-Anteil inkl. Speicherverlust, damit die Summe dem Gesamtverbrauch (und der Autarkie) entspricht
  const n = toHundred([s.fromRoof / s.cons, s.battIn / s.cons, s.imp / s.cons]);
  const cols = ["var(--sun)", "var(--battery)", "var(--grid)"];
  let html = "", k = 0;
  n.forEach((c, i) => { for (let j = 0; j < c; j++) html += `<i style="--c:${cols[i]};animation-delay:${reduced ? 0 : k++ * 6}ms"></i>`; });
  $("dots").innerHTML = html;
  $("dDirect").textContent = String(n[0]); $("dBatt").textContent = String(n[1]); $("dGrid").textContent = String(n[2]);
  $("dAut").textContent = `${n[0] + n[1]} %`;
  const am = s.months.map(r => ({ m: r.m, a: r.direct / r.cons }));
  const best = am.reduce((a, b) => b.a > a.a ? b : a), worst = am.reduce((a, b) => b.a < a.a ? b : a);
  $("dBest").textContent = MONL[best.m]; $("dBestV").textContent = `${f0.format(best.a * 100)} %`;
  $("dWorst").textContent = MONL[worst.m]; $("dWorstV").textContent = `${f0.format(worst.a * 100)} %`;
}

// ---------- Diagramme ----------
const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const charts: Record<string, Chart> = {};
// Chart.js-Konfigurationen sind tief verschachtelt; hier bewusst locker typisiert
function draw(id: string, cfg: any) { charts[id]?.destroy(); charts[id] = new Chart($<HTMLCanvasElement>(id), cfg); }
function opts(): any {
  return {
    responsive: true, maintainAspectRatio: false, animation: { duration: reduced ? 0 : 500 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: css("--card"), titleColor: css("--text"), bodyColor: css("--text"), borderColor: css("--line"), borderWidth: 2,
        padding: 12, cornerRadius: 12, boxPadding: 5, usePointStyle: true, titleFont: { family: "Fredoka", size: 15 }, bodyFont: { family: "Nunito", size: 14 },
      },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: css("--muted"), font: { family: "Nunito", weight: 700 } } },
      y: { grid: { color: css("--line") }, border: { display: false }, ticks: { color: css("--muted"), font: { family: "Nunito" } } },
    },
  };
}

// ---------- Alle Jahre auf einen Blick ----------
export function renderYears(all: Stats[]) {
  // Ein Balken pro Jahr durch die Null: nach oben die Sonnenernte (wohin sie ging), nach unten unser Verbrauch (woher er kam).
  // „Direkt vom Dach“ ist oben und unten derselbe Strom – deshalb dieselbe Farbe, gespiegelt an der Null.
  const C = { sun: "#f2b233", batt: "#2bb3a6", feed: "#7cc46a", grid: "#e8735a" };
  const o = opts();
  o.scales.x.stacked = true; o.scales.y.stacked = true;
  Object.assign(o.scales.x.ticks, { font: { family: "Nunito", weight: 700 }, maxRotation: 0, autoSkip: false });
  o.scales.y.ticks.callback = (v: number) => f0.format(Math.abs(v)) + " kWh";
  o.scales.y.grid.color = (c: any) => c.tick?.value === 0 ? css("--text") : css("--line");
  o.scales.y.grid.lineWidth = (c: any) => c.tick?.value === 0 ? 2 : 1;
  o.plugins.tooltip.filter = (c: any) => c.raw !== 0;
  o.plugins.tooltip.callbacks = {
    label: (c: any) => ` ${c.dataset.label}: ${f0.format(Math.abs(c.raw))} kWh`,
    footer: (items: any[]) => { const x = all[items[0].dataIndex]; return `Erzeugt ${f0.format(x.pv)} kWh · verbraucht ${f0.format(x.cons)} kWh · ${f0.format(x.autarky * 100)} % autark`; },
  };
  const part = (label: string, color: string, v: (x: Stats) => number) =>
    ({ label, data: all.map(v), backgroundColor: color, borderColor: css("--card"), borderWidth: 1.5, borderSkipped: false, stack: "y", barPercentage: .62, categoryPercentage: .9 });
  draw("cYears", {
    type: "bar",
    data: { labels: all.map(x => [yLabel(x.y), `${f0.format(x.autarky * 100)} %`]), datasets: [
      part("☀️ Ernte: direkt selbst genutzt", C.sun, x => x.fromRoof),
      part("☀️ Ernte: in die Batterie", C.batt, x => x.battIn),
      part("☀️ Ernte: eingespeist", C.feed, x => x.exp),
      part("🏠 Verbrauch: direkt vom Dach", C.sun, x => -x.fromRoof),
      part("🏠 Verbrauch: über die Batterie", C.batt, x => -x.battIn),
      part("🏠 Verbrauch: aus dem Netz gekauft", C.grid, x => -x.imp),
    ] },
    options: o,
  });
  $("yearsNote").textContent = `Die Prozentzahl unter jedem Jahr: so viel von unserem Verbrauch kam vom eigenen Dach (autark). * ${FIRST.y} ab ${MONL[FIRST.m]} (Inbetriebnahme), ${LAST.y} bis ${MONL[LAST.m]}. Die Batterie zählt mit dem, was hineinging; was beim Speichern verloren geht, ist darin enthalten.`;
}

// ---------- Batterie & Autarkie-Kalender ----------
export function renderBattery() {
  const sumOf = (rows: Month[], k: "direct" | "cons" | "battIn" | "battOut") => rows.reduce((a, r) => a + r[k], 0);
  const aut = (rows: Month[]) => sumOf(rows, "direct") / sumOf(rows, "cons");
  const cur = yearRows(LAST.y), prev = DATA.filter(r => r.y === LAST.y - 1 && r.m <= LAST.m);
  const range = `${MON[0]}–${MON[LAST.m]}`;
  if (BATT_START) $("bKicker").textContent = `Neu seit ${MONL[BATT_START.m]} ${BATT_START.y}`;
  $("bBeforeL").textContent = `${range} ${LAST.y - 1} · ohne Batterie`;
  $("bAfterL").textContent = `${range} ${LAST.y} · mit Batterie`;
  $("bBefore").textContent = f0.format(aut(prev) * 100) + " %";
  $("bAfter").textContent = f0.format(aut(cur) * 100) + " %";

  // Autarkie Monat für Monat: gewähltes Jahr gegen das Vorjahr
  const y = state.y, py = YEARS.includes(y - 1) ? y - 1 : null;
  const rowsY = yearRows(y), rowsP = py ? yearRows(py) : [];
  const hasBatt = (rows: Month[]) => rows.some(r => r.battIn > 0);
  const tag = (yy: number, rows: Month[]) => `${yy}${hasBatt(rows) ? " mit Batterie" : yy >= (BATT_START?.y ?? 9999) - 1 ? " ohne Batterie" : ""}`;
  $("kPrev").textContent = py ? tag(py, rowsP) : ""; $("kPrev").style.display = py ? "" : "none";
  $("kCur").textContent = tag(y, rowsY);
  $("cAutCmp").setAttribute("aria-label", `Säulendiagramm: Autarkiegrad je Monat ${py ? `${py} gegen ${y}` : `in ${y}`}`);

  const o = opts();
  o.scales.y.max = 100; o.scales.y.ticks.callback = (v: number) => v + " %";
  o.plugins.tooltip.callbacks = { label: (c: any) => ` ${c.dataset.label}: ${f0.format(c.raw)} %` };
  const byM = (rows: Month[], m: number) => { const r = rows.find(x => x.m === m); return r ? r.direct / r.cons * 100 : null; };
  const labels = MON.slice(0, y === LAST.y ? LAST.m + 1 : 12);
  draw("cAutCmp", {
    type: "bar",
    data: { labels, datasets: [
      ...(py ? [{ label: String(py), data: labels.map((_, m) => byM(rowsP, m)), backgroundColor: css("--grid") + "99", borderRadius: 6 }] : []),
      { label: String(y), data: labels.map((_, m) => byM(rowsY, m)), backgroundColor: css("--leaf"), borderRadius: 6 },
    ] },
    options: o,
  });

  // Batterie: geladen und entladen im gewählten Jahr
  const bc = css("--battery"), battY = hasBatt(rowsY);
  $("battEmpty").hidden = battY; $("cBattBox").hidden = !battY;
  if (BATT_START) $("battEmpty").textContent = `Im Jahr ${y} hatten wir noch keine Batterie. Sie kam erst im ${MONL[BATT_START.m]} ${BATT_START.y} dazu.`;
  if (battY) {
    const ob = opts();
    ob.scales.y.ticks.callback = (v: number) => v + " kWh";
    ob.plugins.tooltip.callbacks = { label: (c: any) => ` ${c.dataset.label}: ${f0.format(c.raw)} kWh` };
    const val = (m: number, k: "battIn" | "battOut") => { const r = rowsY.find(x => x.m === m); return r && r.battIn > 0 ? r[k] : null; };
    draw("cBatt", {
      type: "bar",
      data: { labels, datasets: [
        { label: "Geladen", data: labels.map((_, m) => val(m, "battIn")), backgroundColor: bc + "73", borderRadius: 6 },
        { label: "Entladen", data: labels.map((_, m) => val(m, "battOut")), backgroundColor: bc, borderRadius: 6 },
      ] },
      options: ob,
    });
  }
  $("bYearIn").textContent = f0.format(sumOf(rowsY, "battIn")); $("bYearOut").textContent = f0.format(sumOf(rowsY, "battOut"));
  $("bYearSum").hidden = !battY;
  const br = DATA.filter(r => r.battIn > 0);
  const bin = sumOf(br, "battIn"), bout = sumOf(br, "battOut");
  $("bIn").textContent = f0.format(bin); $("bOut").textContent = f0.format(bout); $("bEff").textContent = f0.format(bout / bin * 100);

  let h = `<div class="h"></div>` + MON.map(m => `<div class="h">${m[0]}</div>`).join("");
  for (const y of YEARS) {
    h += `<div class="y" data-y="${y}">${y}</div>`;
    for (let m = 0; m < 12; m++) {
      const r = DATA.find(x => x.y === y && x.m === m);
      if (!r) { h += `<div class="cell empty">–</div>`; continue; }
      const a = r.direct / r.cons;
      h += `<div class="cell" data-y="${y}" data-m="${m}" title="${MONL[m]} ${y}: ${f0.format(a * 100)} % vom eigenen Dach${r.battIn ? " (mit Batterie)" : ""}"
        style="background:color-mix(in srgb, var(--leaf) ${Math.round(6 + a * 84)}%, #fff);color:var(--text)">${f0.format(a * 100)}</div>`;
    }
  }
  $("heat").innerHTML = h;
}

// ---------- Jahreslauf ----------
export function renderMonths(s: Stats) {
  const o = opts();
  o.scales.x.stacked = true; o.scales.y.stacked = true;
  o.scales.y.ticks.callback = (v: number) => f0.format(v) + " kWh";
  o.plugins.tooltip.callbacks = { label: (c: any) => ` ${c.dataset.label}: ${f0.format(c.raw)} kWh` };
  const full = MON.map((_, m) => s.months.find(r => r.m === m));
  const v = (k: "pv" | "heat" | "home") => full.map(r => r ? r[k] : null);
  const sun = css("--sun");
  draw("cMonths", {
    data: { labels: MON, datasets: [
      { type: "line", label: "☀️ Sonnenernte", data: v("pv"), borderColor: sun, backgroundColor: sun + "40", fill: true, tension: 0.4, borderWidth: 4, pointRadius: 0, pointHoverRadius: 6, stack: "pv", order: 0 },
      { type: "bar", label: "🌡️ Heizen (geschätzt)", data: v("heat"), backgroundColor: css("--heat"), borderRadius: 6, stack: "use", order: 1 },
      { type: "bar", label: "🚿 Haushalt & Co.", data: v("home"), backgroundColor: css("--home"), borderRadius: 6, stack: "use", order: 1 },
    ] },
    options: o,
  });
  const pv = s.months.map(r => r.pv), best = s.months[pv.indexOf(Math.max(...pv))], worst = s.months[pv.indexOf(Math.min(...pv))];
  $("mBest").textContent = MONL[best.m]; $("mWorst").textContent = MONL[worst.m];
  $("mRatio").textContent = f0.format(best.pv / worst.pv);
}

// ---------- Geld & Vergleich ----------
export function renderMoney(all: Stats[], s: Stats) {
  const R = REFS[state.ref], A = M.A, P = M.P;
  document.querySelectorAll<HTMLElement>(".ref").forEach(b => { const on = b.dataset.k === state.ref; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  $("kRef").textContent = R.name; setAll(".refName", R.name);
  $("wwInfo").textContent = f0.format(A.wwKwh);
  const o = opts();
  o.scales.y.ticks.callback = (v: number) => f0.format(v) + " €";
  o.scales.y2 = { position: "right", grid: { display: false }, border: { display: false }, ticks: { color: css("--muted"), callback: (v: number) => f0.format(v / 1000) + " T€" } };
  o.plugins.tooltip.callbacks = { label: (c: any) => ` ${c.dataset.label}: ${eur(c.raw)}` };
  let cum = 0;
  const cums = all.map(x => (cum += x.saved));
  const sel = all.map(x => x.y === s.y), g = css("--grid"), l = css("--leaf");
  draw("cCost", {
    data: { labels: all.map(x => yLabel(x.y)), datasets: [
      { type: "line", label: "Gespart (Summe)", data: cums, yAxisID: "y2", borderColor: css("--sun"), backgroundColor: css("--sun"), borderWidth: 3, tension: 0.3, pointRadius: 4, order: 0 },
      { type: "bar", label: R.short, data: all.map(x => x.ref.cost), backgroundColor: sel.map(b => b ? g : g + "88"), borderRadius: 8, order: 1 },
      { type: "bar", label: "Unser Sonnenhaus", data: all.map(x => x.ourCost), backgroundColor: sel.map(b => b ? l : l + "88"), borderRadius: 8, order: 1 },
    ] },
    options: o,
  });
  count($("pTotal"), cum, { format: eur });
  $("pRef").textContent = R.name;
  $("pYear").textContent = s.saved >= 0 ? `${eur(s.saved)} weniger` : `${eur(-s.saved)} mehr`;

  $("costTable").innerHTML = `<tr><th>Jahr</th><th>Strompreis</th><th>${R.short}</th><th>Unser Sonnenhaus</th><th>Gespart</th></tr>` +
    all.map(x => `<tr class="${x.y === s.y ? "sel" : ""}"><td>${yLabel(x.y)}</td><td>${f1.format(P[x.y].strom)} ct${TARIF[x.y] ? " 🌱" : ""}</td><td>${eur(x.ref.cost)}</td><td>${x.ourCost < 0 ? `<span class="good">${eur(-x.ourCost)} Plus 🎉</span>` : eur(x.ourCost)}</td><td class="good">${eur(x.saved)}</td></tr>`).join("") +
    `<tr><td colspan="5" class="muted" style="font-size:13px;text-align:left">* ${FIRST.y} ab ${MONL[FIRST.m]} (Inbetriebnahme), ${LAST.y} bis ${MONL[LAST.m]} · 🌱 = unser Tarif bei Green Planet Energy, sonst Durchschnittspreise · unsere Kosten = Netzstrom + Grundgebühr − Einspeisevergütung</td></tr>`;

  $("vSelf").textContent = f1.format(P[s.y].strom); $("vFeed").textContent = f2.format(A.feedIn);
  $("vRatio").textContent = f1.format(P[s.y].strom / A.feedIn);
}

// ---------- Hat es sich gelohnt? ----------
export function renderPayback() {
  const s = st(DATA, "same");
  $("timeline").innerHTML = INVEST.map(i => `<div class="tl" style="--c:${i.c}"><div class="d">${i.date}</div><b>${i.icon} ${i.title}</b><div class="c">${eur(i.cost)}</div></div>`).join("");
  const cost = (k: string) => INVEST.filter(i => i.key === k).reduce((a, i) => a + i.cost, 0);
  const lastFull = st(yearRows(FULL_YEARS[FULL_YEARS.length - 1]), "same");
  const recent = st(DATA.filter(r => after(r, { y: LAST.y - 1, m: LAST.m + 1 })), "same"); // letzte 12 Monate
  const items = [
    { k: "pv", ic: "☀️", c: "var(--sun)", t: "Solardach", gain: s.pvGain, per: recent.pvGain },
    { k: "batt", ic: "🔋", c: "var(--battery)", t: "Batterie", gain: s.battGain, per: recent.battGain },
    // Klimaanlage: Kaufersparnis gegenüber der gewählten Alternative plus Energiekosten (siehe acCard)
    { k: "ac", ic: "❄️", c: "var(--heat)", t: "Klimaanlage", gain: acAdvantage(M, s, cost("ac"), state.acCmp).total,
      per: acAdvantage(M, lastFull, 0, state.acCmp).run },
  ];
  const left = (c: number, g: number, per: number) =>
    g >= c ? "🎉 Hat sich schon bezahlt gemacht!" : per > 0 ? `Noch etwa <b>${f1.format((c - g) / per)} Jahre</b> (bei ~${eur(per)} pro Jahr)` : "";
  // Klimaanlage gegen eine Gasheizung oder eine Luft-Wasser-Wärmepumpe mit Heizkörpern – jeweils Anschaffung und Betrieb.
  // Das Haus hatte vorher Stromheizung: Beide Alternativen hätten erst ein Wasser-Heizsystem gebraucht.
  const A = M.A;
  const cmpSwitch = `<div class="accmp" role="group" aria-label="Klimaanlage vergleichen mit">${(
    [["gas", "🔥 Gasheizung"], ["hp", "💧 Wärmepumpe mit Heizkörpern"]] as const).map(([k, l]) =>
    `<button type="button" data-cmp="${k}" aria-pressed="${state.acCmp === k}" class="${state.acCmp === k ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const acCard = (c: number) => {
    const gas = state.acCmp === "gas", { alt, buy, run, total } = acAdvantage(M, s, c, state.acCmp);
    const altName = gas ? "Gasheizung mit Gasanschluss und Heizkörpern" : "Luft-Wasser-Wärmepumpe mit Heizkörpern";
    const altCost = gas ? eur(A.gasInvest) : `${eur(alt)} (${eur(A.hpInvest)} minus ${f0.format(A.hpFunding * 100)} % Förderung)`;
    const why = gas ? "Gas für dieselbe Wärme und das warme Wasser plus Grundgebühr für den Gasanschluss, statt Strom für Klimaanlage und Durchlauferhitzer."
      : "Die Klimaanlage heizt sparsamer, die Wärmepumpe würde dafür das warme Wasser günstiger machen.";
    return `<div class="card pb" style="--c:var(--heat)"><div class="em">❄️</div><h3>Klimaanlage</h3>${cmpSwitch}
      <div class="muted small">statt ${altName} · bisher gespart</div><div class="big num">${eur(total)}</div>
      <div class="progress"><i style="width:${total > 0 ? 100 : 0}%"></i></div>
      <div class="small"><b>Beim Kauf:</b> ${eur(c)} statt ca. ${altCost} = <b>${buy >= 0 ? `${eur(buy)} weniger` : `${eur(-buy)} mehr`}</b>.</div>
      <div class="small" style="margin-top:4px"><b>Im Betrieb seit 2020:</b> ${run >= 0 ? `${eur(run)} weniger` : `${eur(-run)} mehr`} Energiekosten. ${why}</div>
      ${total > 0 ? `<div class="small" style="margin-top:6px">🎉 <b>Vom ersten Tag an die günstigere Wahl.</b></div>` : ""}</div>`;
  };
  $("payback").innerHTML = items.map(i => {
    if (i.k === "ac") return acCard(cost(i.k));
    const c = cost(i.k), pct = Math.min(1, i.gain / c);
    return `<div class="card pb" style="--c:${i.c}"><div class="em">${i.ic}</div><h3>${i.t}</h3>
      <div class="muted small">gekostet ${eur(c)} · bisher gespart</div><div class="big num">${eur(i.gain)}</div>
      <div class="progress"><i style="width:${pct * 100}%"></i></div>
      <div class="small"><b>${f0.format(i.gain / c * 100)} %</b> wieder drin. ${left(c, i.gain, i.per)}</div></div>`;
  }).join("");
  const tc = INVEST.reduce((a, i) => a + i.cost, 0), tg = items.reduce((a, i) => a + i.gain, 0), tp = items.reduce((a, i) => a + i.per, 0);
  $("payTotal").innerHTML = `<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:baseline">
      <div><b style="font-family:Fredoka;font-size:20px">Alles zusammen</b><div class="muted small">${eur(tc)} ausgegeben seit 2019</div></div>
      <div class="big num">${eur(tg)} gespart</div></div>
    <div class="progress" style="background:var(--card)"><i style="width:${Math.min(100, tg / tc * 100)}%"></i></div>
    <div class="small">${f0.format(tg / tc * 100)} % sind schon wieder drin. ${left(tc, tg, tp)} Die Klimaanlage zählt mit, was sie gegenüber ${state.acCmp === "gas" ? "einer Gasheizung" : "einer Wasser-Wärmepumpe"} beim Kauf und im Betrieb gespart hat.</div>`;
}

// ---------- Klima ----------
export function renderClimate(all: Stats[], s: Stats) {
  const A = M.A;
  count($("kYear"), s.co2 / 1000, f1);
  const trees = Math.max(0, s.co2 / A.treeKg);
  const unit = [1, 2, 5, 10, 20, 50, 100].find(u => trees / u <= 60) ?? 100;
  $("trees").textContent = "🌳".repeat(Math.max(1, Math.round(trees / unit)));
  $("kTrees").textContent = f0.format(trees);
  $("kTreeUnit").textContent = unit > 1 ? `(Ein 🌳 steht für ${unit} Bäume.)` : "";
  const t = (v: number) => f1.format(v / 1000) + " t";
  $("kHeatL").textContent = { gas: "🔥 Kein Gas für Heizung & Warmwasser", oil: "🛢️ Kein Heizöl für Heizung & Warmwasser", hp: "🌡️ Heizung & Warmwasser (Unterschied zur Wärmepumpe)" }[REFS[state.ref].fuel];
  $("kHeat").textContent = t(s.co2Heat); $("kGrid").textContent = t(s.co2Grid); $("kExp").textContent = t(s.co2Exp); $("kSum").textContent = t(s.co2);
  const km = s.co2 / A.carKg;
  $("kCar").textContent = f0.format(km); $("kEarth").textContent = f1.format(km / 40075);
  $("kTotal").textContent = f0.format(all.reduce((a, x) => a + x.co2, 0) / 1000);
  $("aTree").textContent = String(A.treeKg);
  $("aBoiler").textContent = f0.format(A.boiler * 100); $("aBaseGas").textContent = f0.format(A.baseGas);
}

export function initSections() {
  $("payback").addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLElement>("[data-cmp]");
    if (b) { state.acCmp = b.dataset.cmp as "gas" | "hp"; app.render(); }
  });
  $("refs").innerHTML = (Object.keys(REFS) as RefKey[]).map(k => { const R = REFS[k];
    return `<button class="ref" data-k="${k}" aria-pressed="false"><div class="em">${R.icon}</div><b>${R.name}</b><span>${R.desc}</span></button>`; }).join("");
  $("refs").addEventListener("click", e => {
    const b = (e.target as Element).closest<HTMLElement>(".ref");
    if (b) { state.ref = b.dataset.k as RefKey; app.render(); }
  });
}
