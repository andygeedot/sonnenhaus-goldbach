// Alle Zahlen für das Schaufenster – aus denselben Daten und Rechnungen wie die Website.
import { acAdvantage } from "../calc";
import { HOUSE, INVEST } from "../config";
import { DATA, FULL_YEARS, LAST, M, st, yearRows } from "../model";
import { MONL } from "../ui";

const sum = (rows: typeof DATA, k: "direct" | "cons") => rows.reduce((a, r) => a + r[k], 0);

export function facts() {
  const month = st([LAST], "same");
  const cur = st(yearRows(LAST.y), "same");
  const full = st(yearRows(FULL_YEARS[FULL_YEARS.length - 1]), "same");
  const all = st(DATA, "same");
  const fulls = FULL_YEARS.map(y => st(yearRows(y), "same"));
  const avg = (k: "pv" | "exp") => fulls.reduce((a, s) => a + s[k], 0) / fulls.length;
  const prev = DATA.filter(r => r.y === LAST.y - 1 && r.m <= LAST.m);
  const investTotal = INVEST.reduce((a, i) => a + i.cost, 0);
  const acCost = INVEST.filter(i => i.key === "ac").reduce((a, i) => a + i.cost, 0);
  // Jahresmengen für die Strom-Männchen: vor der Batterie (volle Jahre) und mit Batterie (laufendes Jahr, aufs Jahr hochgerechnet)
  const pre = FULL_YEARS.filter(y => y < LAST.y).map(y => st(yearRows(y), "same"));
  const avgPre = (k: "pv" | "cons" | "imp" | "exp" | "direct") => pre.reduce((a, s) => a + s[k], 0) / pre.length;
  const perYear = 12 / cur.n;
  const flows = {
    gridAll: avgPre("cons"),            // früher: alles aus dem Netz
    grid: avgPre("imp"),                // mit Solardach, ohne Batterie
    gridBatt: cur.imp * perYear,        // mit Batterie
    sun: avgPre("pv"),
    roof: avgPre("direct"),
    exp: avgPre("exp"),
    battIn: cur.battIn * perYear,
    battOut: cur.battOut * perYear,
  };
  const pv = full.months.map(r => r.pv);
  const best = full.months[pv.indexOf(Math.max(...pv))], worst = full.months[pv.indexOf(Math.min(...pv))];
  return {
    year: LAST.y,
    monthName: `${MONL[LAST.m]} ${LAST.y}`,
    /** „2026 bis Oktober“ */
    yearLabel: LAST.m < 11 ? `${LAST.y} bis ${MONL[LAST.m]}` : String(LAST.y),
    kwp: HOUSE.kwp,
    month, cur, full, all, flows,
    fullYear: full.y,
    avgPv: avg("pv"),
    avgExp: avg("exp"),
    households: avg("exp") / 2500,   // durchschnittlicher kleiner Haushalt ohne Heizung
    best, worst,
    autPrev: sum(prev, "direct") / sum(prev, "cons"),
    autCur: cur.autarky,
    savedTotal: all.saved,
    acGain: all.acGain,
    // Klimaanlage gegenüber einer Gasheizung: Kaufersparnis plus Energiekosten (wie auf der Seite)
    paid: (all.pvGain + all.battGain + acAdvantage(M, all, acCost, "gas").total) / investTotal,
    investTotal,
    co2Total: all.co2,
    trees: all.co2 / M.A.treeKg / (all.n / 12),   // Bäume, die so viel CO₂ pro Jahr aufnehmen
    price: M.P[LAST.y].strom,
  };
}
export type Facts = ReturnType<typeof facts>;
