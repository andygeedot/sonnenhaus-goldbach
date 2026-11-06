// Reine Rechnungen ohne Seite – darum gut testbar (siehe calc.test.ts).
import { AC_FROM, HOUSE, REFS } from "./config";
import type { Model, Month, RawMonth, RefKey, RefTotals, Stats, YM } from "./types";

export const after = (r: YM, f: YM) => r.y > f.y || (r.y === f.y && r.m >= f.m);

/**
 * Bereitet die Rohdaten auf. Seit Nov. 2026 misst ein Zähler an der Klimaanlage Heizen und Kühlen getrennt.
 * Für die Monate davor wird Heizstrom geschätzt: alles, was ein Monat über dem Sommerverbrauch (Juni–August) desselben Jahres liegt.
 */
export function prepare(raw: RawMonth[]) {
  const data: Month[] = raw.map(r => ({ ...r, battIn: r.battIn ?? 0, battOut: r.battOut ?? 0, fromRoof: r.direct - (r.battIn ?? 0),
    heat: r.heat ?? 0, cool: r.heat != null ? r.cool ?? 0 : 0, home: 0, heatMeasured: r.heat != null }));
  const summerBase = (y: number) => {
    const s = data.filter(r => r.y === y && r.m >= 5 && r.m <= 7);
    return s.length ? s.reduce((a, r) => a + r.cons, 0) / s.length : null;
  };
  const base: Record<number, number> = {};
  for (const r of data) {
    if (!(r.y in base)) base[r.y] = summerBase(r.y) ?? summerBase(r.y - 1) ?? 0;
    if (!r.heatMeasured) r.heat = Math.max(0, r.cons - base[r.y]);
    r.home = Math.max(0, r.cons - r.heat - r.cool);
  }
  const years = [...new Set(data.map(r => r.y))];
  const fullYears = years.filter(y => data.filter(r => r.y === y).length === 12);
  // Anteil jedes Monats am Jahres-Heizbedarf (Mittel der vollen Jahre) – verteilt die kWh/m² der Vergleichshäuser
  const sums = Array<number>(12).fill(0);
  for (const r of data) if (fullYears.includes(r.y)) sums[r.m] += r.heat;
  const tot = sums.reduce((a, b) => a + b, 0) || 1;
  const shape = sums.map(v => v / tot);
  return { data, years, fullYears, shape, first: data[0], last: data[data.length - 1], battStart: data.find(r => r.battIn > 0) };
}

/** Vor der Klimaanlage haben wir direkt mit Strom geheizt: 1 kWh Strom = 1 kWh Wärme. */
export const jazAt = (M: Model, r: YM) => after(r, AC_FROM) ? M.A.jaz : 1;

/**
 * Was die Klimaanlage in einem Monat gegenüber einer Gasheizung spart (€): Die Gasheizung bräuchte Gas für dieselbe Wärme
 * und das warme Wasser plus Grundgebühr; wir brauchen Heizstrom für die Klimaanlage und Strom für den Durchlauferhitzer.
 */
export function acVsGas(M: Model, r: Month): number {
  const p = M.P[r.y], A = M.A, ww = Math.min(A.wwKwh / 12, r.home);
  return (r.heat * A.jaz + ww) / A.boiler * p.gas / 100 + A.baseGas - (r.heat + ww) * p.strom / 100;
}

/**
 * Betriebskosten-Vorteil der Klimaanlage gegenüber einer Luft-Wasser-Wärmepumpe in einem Monat (€):
 * Die Wärmepumpe bräuchte für dieselbe Wärme Strom / JAZ und für warmes Wasser Wärme / Arbeitszahl;
 * wir brauchen den Heizstrom der Klimaanlage plus Strom für den Durchlauferhitzer (1 kWh Strom = 1 kWh warmes Wasser).
 */
export function acVsHp(M: Model, r: Month): number {
  const p = M.P[r.y], A = M.A, ww = Math.min(A.wwKwh / 12, r.home);
  const hp = r.heat * A.jaz / A.jazHp + ww / A.jazWW, ours = r.heat + ww;
  return (hp - ours) * p.strom / 100;
}

/**
 * Gesamtvorteil der Klimaanlage gegenüber der Alternative (€): beim Kauf weniger ausgegeben plus Energiekosten seit 2020.
 * Gas ohne Förderung, die Wärmepumpe nach Förderung.
 */
export function acAdvantage(M: Model, s: Stats, acCost: number, vs: "gas" | "hp") {
  const A = M.A, alt = vs === "gas" ? A.gasInvest : A.hpInvest * (1 - A.hpFunding);
  const buy = alt - acCost, run = vs === "gas" ? s.acGain : s.acRunVsHp;
  return { alt, buy, run, total: buy + run };
}

/** Was das gewählte Vergleichshaus im selben Monat gebraucht und gekostet hätte. */
export function refMonth(M: Model, r: Month, key: RefKey): RefTotals {
  const R = REFS[key], p = M.P[r.y], A = M.A;
  const useful = r.heat * jazAt(M, r);
  const heat = R.kwhm2 ? R.kwhm2 * HOUSE.area * M.shape[r.m] : useful; // Nutzwärme Raumheizung
  // Warmwasser läuft im Vergleichshaus über die Heizung statt über unseren Durchlauferhitzer (≈ 100 % Wirkungsgrad)
  const ww = Math.min(A.wwKwh / 12, r.home);
  let fuel: number, heatCost: number, heatCO2: number;
  if (R.fuel === "hp") { fuel = heat / A.jazRef + ww / A.jazWW; heatCost = fuel * p.strom / 100; heatCO2 = fuel * p.co2 / 1000; }
  else if (R.fuel === "gas") { fuel = (heat + ww) / A.boiler; heatCost = fuel * p.gas / 100 + A.baseGas; heatCO2 = fuel * A.gasCO2; }
  else { fuel = (heat + ww) / A.oilEff; heatCost = fuel * p.oil / 100; heatCO2 = fuel * A.oilCO2; }
  const home = r.home - ww;
  const elecCost = home * p.strom / 100 + p.base;
  const elec = home + (R.fuel === "hp" ? fuel : 0);
  return { heat, ww, fuel, home, elec, heatCost, heatCO2, elecCost, cost: heatCost + elecCost, co2: heatCO2 + home * p.co2 / 1000 };
}

const SUM_KEYS = ["pv", "cons", "imp", "exp", "direct", "battIn", "battOut", "fromRoof", "heat", "cool", "home"] as const;

/** Summen, Kosten, CO₂ und Ersparnisse für beliebige Monate (ein Monat, ein Jahr, alles). */
export function stats(M: Model, rows: Month[], refKey: RefKey): Stats {
  const A = M.A;
  const sum = Object.fromEntries(SUM_KEYS.map(k => [k, rows.reduce((a, r) => a + r[k], 0)])) as Record<(typeof SUM_KEYS)[number], number>;
  const ref: RefTotals = { heat: 0, ww: 0, fuel: 0, home: 0, elec: 0, heatCost: 0, heatCO2: 0, elecCost: 0, cost: 0, co2: 0 };
  let ourCost = 0, ourCO2 = 0, solarGain = 0, battGain = 0, acGain = 0, acRunVsHp = 0, heatUseful = 0, co2HeatOurs = 0, co2Grid = 0, co2Exp = 0;
  for (const r of rows) {
    const p = M.P[r.y];
    ourCost += r.imp * p.strom / 100 + p.base - r.exp * A.feedIn / 100;
    ourCO2 += (r.imp - r.exp) * p.co2 / 1000;
    const rm = refMonth(M, r, refKey);
    for (const k of Object.keys(ref) as (keyof RefTotals)[]) ref[k] += rm[k];
    solarGain += r.direct * p.strom / 100 + r.exp * A.feedIn / 100;
    // Batterie: abends genutzter Strom statt Netzstrom, dafür entgeht die Einspeisevergütung für das Geladene
    battGain += r.battOut * p.strom / 100 - r.battIn * A.feedIn / 100;
    // Klimaanlage gegen Gasheizung bzw. Luft-Wasser-Wärmepumpe (je Heizen + warmes Wasser)
    if (after(r, AC_FROM)) { acGain += acVsGas(M, r); acRunVsHp += acVsHp(M, r); }
    heatUseful += r.heat * jazAt(M, r);
    // Heizung + Warmwasser im Vergleichshaus gegen unseren Strom für beides
    co2HeatOurs += (r.heat + Math.min(A.wwKwh / 12, r.home)) * p.co2 / 1000;
    co2Grid += r.direct * p.co2 / 1000;
    co2Exp += r.exp * p.co2 / 1000;
  }
  return {
    n: rows.length, months: rows, y: rows[0]?.y, ...sum, measuredN: rows.filter(r => r.heatMeasured).length,
    autarky: sum.direct / sum.cons, heatUseful,
    ourCost, ourCO2, solarGain, battGain, acGain, acRunVsHp, pvGain: solarGain - battGain,
    ref, saved: ref.cost - ourCost,
    co2Heat: ref.heatCO2 - co2HeatOurs, co2Grid, co2Exp, co2: ref.co2 - ourCO2,
  };
}

/** Rundet Anteile so, dass sie genau 100 ergeben (größter Rest bekommt den Rest). */
export function toHundred(fractions: number[]): number[] {
  const n = fractions.map(x => Math.floor(x * 100));
  fractions.map((x, i) => [x * 100 - n[i], i]).sort((a, b) => b[0] - a[0])
    .slice(0, Math.max(0, 100 - n.reduce((a, b) => a + b, 0))).forEach(([, i]) => n[i]++);
  return n;
}
