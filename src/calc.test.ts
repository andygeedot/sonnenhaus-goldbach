import { describe, expect, it } from "vitest";
import { acVsHp, after, jazAt, prepare, refMonth, stats, toHundred } from "./calc";
import { DEFAULT_A, DEFAULT_P, HOUSE } from "./config";
import type { Model, RawMonth } from "./types";

// Ein volles Jahr mit glatten Zahlen: Sommer 200 kWh, Winter mehr; dazu zwei Monate mit Batterie.
const CONS = [500, 400, 300, 250, 220, 200, 200, 200, 230, 280, 380, 480];
function year(y: number, batt = false): RawMonth[] {
  return CONS.map((cons, m) => {
    const pv = [100, 200, 500, 800, 1000, 1100, 1100, 900, 600, 300, 120, 80][m];
    const direct = Math.min(cons * 0.6, pv), exp = pv - direct, imp = cons - direct;
    return { y, m, pv, imp, exp, cons, direct, ...(batt ? { battIn: 50, battOut: 40 } : {}) };
  });
}
const model = (raw: RawMonth[]): Model => {
  const p = prepare(raw);
  return { data: p.data, shape: p.shape, A: { ...DEFAULT_A }, P: structuredClone(DEFAULT_P) };
};

describe("prepare", () => {
  it("schätzt Heizstrom als Mehrverbrauch über dem Sommer", () => {
    const p = prepare(year(2025));
    expect(p.data[0].heat).toBe(300); // Januar 500 − Sommerschnitt 200
    expect(p.data[6].heat).toBe(0);
    expect(p.data[0].home).toBe(200);
  });
  it("verteilt die Monatsanteile auf genau 1", () => {
    const { shape } = prepare(year(2025));
    expect(shape.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
  it("trennt Dach-direkt und Batterie", () => {
    const { data } = prepare(year(2026, true));
    expect(data[5].fromRoof).toBe(data[5].direct - 50);
  });
});

describe("stats", () => {
  const M = model([...year(2025), ...year(2026, true)]);
  const y25 = M.data.filter(r => r.y === 2025);

  it("Autarkie = selbst genutzter Sonnenstrom ÷ Verbrauch", () => {
    const s = stats(M, y25, "same");
    expect(s.autarky).toBeCloseTo(s.direct / s.cons, 10);
    expect(s.direct + s.imp).toBeCloseTo(s.cons, 6);
  });

  it("unsere Kosten = Netzstrom + Grundgebühr − Einspeisung", () => {
    const r = y25[0], p = M.P[2025];
    const s = stats(M, [r], "same");
    expect(s.ourCost).toBeCloseTo(r.imp * p.strom / 100 + p.base - r.exp * M.A.feedIn / 100, 6);
  });

  it("Vergleichshäuser mit kWh/m² treffen ihren Jahreswert genau", () => {
    expect(stats(M, y25, "avg").ref.heat).toBeCloseTo(130 * HOUSE.area, 6);
    expect(stats(M, y25, "old").ref.heat).toBeCloseTo(200 * HOUSE.area, 6);
  });

  it("Warmwasser läuft im Vergleichshaus über die Heizung", () => {
    const s = stats(M, y25, "same");
    expect(s.ref.ww).toBeCloseTo(M.A.wwKwh, 6);
    expect(s.ref.home).toBeCloseTo(s.home - M.A.wwKwh, 6);
  });

  it("Batterie bringt Strompreis für Entladenes minus entgangene Einspeisung", () => {
    const r = M.data.find(x => x.y === 2026 && x.m === 5)!, p = M.P[2026];
    expect(stats(M, [r], "same").battGain).toBeCloseTo(40 * p.strom / 100 - 50 * M.A.feedIn / 100, 6);
  });

  it("Klimaanlage spart gegenüber Gasheizung: Gas für Wärme und warmes Wasser + Grundgebühr − unser Strom dafür", () => {
    const r = M.data.find(x => x.y === 2026 && x.m === 0)!, p = M.P[2026], A = M.A;
    const ww = Math.min(A.wwKwh / 12, r.home);
    const gas = (r.heat * A.jaz + ww) / A.boiler * p.gas / 100 + A.baseGas;
    expect(stats(M, [r], "same").acGain).toBeCloseTo(gas - (r.heat + ww) * p.strom / 100, 6);
  });

  it("Klimaanlage gegen Luft-Wasser-Wärmepumpe: Heizen sparsamer, Warmwasser teurer", () => {
    const r = M.data.find(x => x.y === 2026 && x.m === 0)!, p = M.P[2026], A = M.A;
    const ww = Math.min(A.wwKwh / 12, r.home);
    const hp = r.heat * A.jaz / A.jazHp + ww / A.jazWW;
    expect(acVsHp(M, r)).toBeCloseTo((hp - r.heat - ww) * p.strom / 100, 6);
    expect(stats(M, [r], "same").acRunVsHp).toBeCloseTo(acVsHp(M, r), 6);
  });

  it("CO₂-Aufschlüsselung ergibt die Summe", () => {
    for (const ref of ["same", "avg", "old", "new"] as const) {
      const s = stats(M, y25, ref);
      expect(s.co2Heat + s.co2Grid + s.co2Exp).toBeCloseTo(s.co2, 6);
    }
  });
});

describe("Helfer", () => {
  it("vor der Klimaanlage zählt Heizstrom 1:1 als Wärme", () => {
    const M = model(year(2025));
    expect(jazAt(M, { y: 2019, m: 11 })).toBe(1);
    expect(jazAt(M, { y: 2020, m: 0 })).toBe(M.A.jaz);
  });
  it("after vergleicht Jahr und Monat", () => {
    expect(after({ y: 2026, m: 2 }, { y: 2026, m: 2 })).toBe(true);
    expect(after({ y: 2025, m: 11 }, { y: 2026, m: 0 })).toBe(false);
  });
  it("toHundred ergibt immer genau 100", () => {
    expect(toHundred([0.333, 0.333, 0.334]).reduce((a, b) => a + b)).toBe(100);
    const fr = [0.286, 0.328, 0.386], n = toHundred(fr);
    expect(n.reduce((a, b) => a + b)).toBe(100);
    n.forEach((v, i) => expect(Math.abs(v - fr[i] * 100)).toBeLessThan(1));
  });
  it("refMonth Neubau-Wärmepumpe braucht Strom statt Brennstoff", () => {
    const M = model(year(2025));
    const r = refMonth(M, M.data[0], "new");
    expect(r.elec).toBeCloseTo(r.home + r.fuel, 6);
  });
});
