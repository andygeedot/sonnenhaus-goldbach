import { describe, expect, it } from "vitest";
// @ts-expect-error – reines JavaScript ohne Typen
import { parseNum, parseSunnyPortalCsv, parseBatteryCsv, upsertMonth, validatePayload, withDerived, withHeatTopup } from "../scripts/energy-data.mjs";

const CSV = `﻿sep=;
"Version";"4";;;;
"Export Datum UTC";"2026-10-30T11:55:30.279Z";;;;
"";"";;;;
"Zeitraum";"Direktverbrauch [kWh]";"Netzbezug [kWh]";"Netzeinspeisung [kWh]";"Gesamtverbrauch [kWh]";"Gesamterzeugung [kWh]"
"Jan. 2026";"99,61";"512,23";"16,57";"611,84";"116,18"
"Okt. 2026";"156,68";"90,58";"211,92";"349,27";"470,61"
"Nov. 2026";"-";"-";"-";"-";"-"`;

describe("Sunny-Portal-Import", () => {
  it("liest deutsche Zahlen", () => {
    expect(parseNum("1.234,56")).toBe(1234.56);
    expect(parseNum("-")).toBeNull();
  });
  it("liest Monate und überspringt leere", () => {
    const { exported, months } = parseSunnyPortalCsv(CSV);
    expect(exported).toBe("2026-10-30T11:55:30.279Z");
    expect(months.size).toBe(2);
    expect(months.get("2026-0")).toEqual({ y: 2026, m: 0, pv: 116.18, imp: 512.23, exp: 16.57 });
  });
  it("leitet Verbrauch und Eigenverbrauch aus der Netzbilanz ab", () => {
    // Oktober 2026: Export-„Direktverbrauch“ (156,68) ist unvollständig, pv − exp stimmt
    const r = withDerived({ y: 2026, m: 9, pv: 470.61, imp: 90.58, exp: 211.92 });
    expect(r.cons).toBe(349.27);
    expect(r.direct).toBe(258.69);
  });
  it("liest Batteriewerte", () => {
    const b = parseBatteryCsv("# x\njahr;monat;geladen_kwh;entladen_kwh\n2026;3;159,16;127,87\n");
    expect(b.get("2026-2")).toEqual({ battIn: 159.16, battOut: 127.87 });
  });
});

describe("Monatswerte von Home Assistant", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  const ok = { year: 2026, month: 11, pv: 180.5, imp: 300, exp: 40, battIn: 60, battOut: 45 };

  it("nimmt gültige Werte an", () => {
    expect(validatePayload(ok, now)).toEqual({ y: 2026, m: 10, pv: 180.5, imp: 300, exp: 40, battIn: 60, battOut: 45 });
  });
  it("lehnt Unsinn ab", () => {
    expect(() => validatePayload({ ...ok, pv: -1 }, now)).toThrow();
    expect(() => validatePayload({ ...ok, pv: "abc" }, now)).toThrow();
    expect(() => validatePayload({ ...ok, month: 12 }, now)).toThrow(/Zukunft/);
    expect(() => validatePayload({ ...ok, exp: 500 }, now)).toThrow(/vertauscht/);
    expect(() => validatePayload({ ...ok, imp: undefined }, now)).toThrow(/fehlt/);
    expect(() => validatePayload({ ...ok, pv: 0, imp: 0, exp: 0 }, now)).toThrow(/Vormonat/);
  });
  it("ersetzt keinen vorhandenen Monat durch einen unvollständigen", () => {
    const data = { updated: "", months: [withDerived({ y: 2026, m: 9, pv: 471, imp: 91, exp: 212 })] };
    expect(() => upsertMonth(data, { y: 2026, m: 9, pv: 30, imp: 12, exp: 5 }, now)).toThrow(/unvollständig/);
  });
  it("ersetzt einen Monat und behält Batteriewerte, wenn keine mitkommen", () => {
    const data = { updated: "", months: [withDerived({ y: 2026, m: 9, pv: 400, imp: 90, exp: 200, battIn: 150, battOut: 110 })] };
    const out = upsertMonth(data, { y: 2026, m: 9, pv: 470, imp: 91, exp: 212 }, now);
    expect(out.months).toHaveLength(1);
    expect(out.months[0]).toMatchObject({ pv: 470, battIn: 150, battOut: 110, cons: 349 });
    expect(out.updated).toBe("2026-11-15");
  });
  it("nimmt Heizen und Kühlen der Klimaanlage an", () => {
    expect(validatePayload({ ...ok, heat: 85.4, cool: 0 }, now)).toMatchObject({ heat: 85.4, cool: 0 });
    expect(() => validatePayload({ ...ok, heat: 400, cool: 100 }, now)).toThrow(/ganze Verbrauch/);
    expect(() => validatePayload({ ...ok, cool: 5 }, now)).toThrow(/ohne/);
    expect(() => validatePayload({ ...ok, heat: -1 }, now)).toThrow();
  });
  it("zählt den Nachtrag für den 1.–4.11.2026 dazu, sonst nichts", () => {
    expect(withHeatTopup({ y: 2026, m: 10, heat: 80 }).heat).toBe(82.92);
    expect(withHeatTopup({ y: 2026, m: 11, heat: 80 }).heat).toBe(80);
    expect(withHeatTopup({ y: 2026, m: 10 }).heat).toBeUndefined();
  });
  it("behält Klimawerte und einen deutlich größeren Heizwert", () => {
    const data = { updated: "", months: [withDerived({ y: 2026, m: 10, pv: 180, imp: 300, exp: 40, heat: 90, cool: 0 })] };
    expect(upsertMonth(data, { y: 2026, m: 10, pv: 181, imp: 300, exp: 40 }, now).months[0]).toMatchObject({ heat: 90, cool: 0 });
    expect(upsertMonth(data, { y: 2026, m: 10, pv: 181, imp: 300, exp: 40, heat: 20, cool: 0 }, now).months[0].heat).toBe(90);
    expect(upsertMonth(data, { y: 2026, m: 10, pv: 181, imp: 300, exp: 40, heat: 95, cool: 1 }, now).months[0]).toMatchObject({ heat: 95, cool: 1 });
  });
  it("fügt neue Monate sortiert ein", () => {
    const data = { updated: "", months: [withDerived({ y: 2026, m: 9, pv: 1, imp: 1, exp: 0 })] };
    const out = upsertMonth(data, validatePayload(ok, now), now);
    expect(out.months.map((r: { m: number }) => r.m)).toEqual([9, 10]);
  });
});
