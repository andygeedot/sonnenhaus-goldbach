// Gemeinsame Datenlogik für die Skripte (Import aus dem Sunny Portal, Monatswerte von Home Assistant).
// Datenformat data/energy.json: { updated: "JJJJ-MM-TT", months: [{ y, m (0 = Januar), pv, imp, exp, cons, direct, battIn?, battOut?, heat?, cool? }] } – alles kWh.
// heat/cool: von der Klimaanlage gemessen (Shelly-Zwischenstecker, seit 04.11.2026), getrennt nach Heizen und Kühlen.

const MONTHS = { "Jan.": 0, "Feb.": 1, "März": 2, "Apr.": 3, "Mai": 4, "Juni": 5, "Juli": 6, "Aug.": 7, "Sep.": 8, "Okt.": 9, "Nov.": 10, "Dez.": 11 };
const COLS = { Direktverbrauch: "direct", Netzbezug: "imp", Netzeinspeisung: "exp", Gesamtverbrauch: "cons", Gesamterzeugung: "pv" };

const round2 = v => Math.round(v * 100) / 100;
export const key = (y, m) => `${y}-${m}`;

/** "1.234,56" → 1234.56, "-" oder leer → null */
export function parseNum(s) {
  const t = String(s ?? "").trim().replace(/^"|"$/g, "");
  return t === "" || t === "-" ? null : Number(t.replace(/\./g, "").replace(",", "."));
}

const cells = line => line.split(";").map(c => c.trim().replace(/^"|"$/g, ""));

/** Sunny-Portal-Export „Energiebilanz – Jahr“ → { exported, months: Map(key → {y, m, pv, imp, exp}) } */
export function parseSunnyPortalCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).map(cells);
  const head = lines.findIndex(r => r[0] === "Zeitraum");
  if (head < 0) throw new Error("Keine Kopfzeile „Zeitraum“ gefunden – ist das ein Energiebilanz-Export?");
  const cols = lines[head].slice(1, 6).map(c => COLS[c.replace(/\s*\[.*/, "")]);
  const exported = lines.find(r => r[0] === "Export Datum UTC")?.[1] ?? "";
  const months = new Map();
  for (const r of lines.slice(head + 1)) {
    if (!r[0]) continue;
    const [mon, year] = [r[0].slice(0, r[0].lastIndexOf(" ")), r[0].slice(r[0].lastIndexOf(" ") + 1)];
    const v = Object.fromEntries(cols.map((c, i) => [c, parseNum(r[i + 1])]));
    if (!v.cons) continue; // "-" oder 0,00 = keine Messung
    months.set(key(+year, MONTHS[mon]), { y: +year, m: MONTHS[mon], pv: v.pv, imp: v.imp, exp: v.exp });
  }
  return { exported, months };
}

/** data/batterie.csv (jahr;monat;geladen_kwh;entladen_kwh) → Map(key → {battIn, battOut}) */
export function parseBatteryCsv(text) {
  const rows = text.split(/\r?\n/).filter(l => l.trim() && !l.startsWith("#")).map(cells);
  const [h, ...data] = rows;
  const ix = n => h.indexOf(n);
  return new Map(data.map(r => [key(+r[ix("jahr")], +r[ix("monat")] - 1), { battIn: parseNum(r[ix("geladen_kwh")]), battOut: parseNum(r[ix("entladen_kwh")]) }]));
}

/**
 * Ergänzt abgeleitete Werte. Gemessen wird am Netzanschluss, darum gilt:
 * Gesamtverbrauch = Erzeugung + Bezug − Einspeisung, selbst genutzter Sonnenstrom = Erzeugung − Einspeisung.
 * (Der „Direktverbrauch“ im Sunny-Portal-Export ist ab Sep. 2026 unvollständig, deshalb wird er nicht übernommen.)
 */
export function withDerived({ y, m, pv, imp, exp, battIn, battOut, heat, cool }) {
  const out = { y, m, pv: round2(pv), imp: round2(imp), exp: round2(exp), cons: round2(pv + imp - exp), direct: round2(pv - exp) };
  if (battIn != null) out.battIn = round2(battIn);
  if (battOut != null) out.battOut = round2(battOut);
  if (heat != null) out.heat = round2(heat);
  if (cool != null) out.cool = round2(cool);
  return out;
}

/**
 * Was der Klima-Zähler in Home Assistant nicht erfasst hat und einmalig dazukommt (kWh Heizen), Schlüssel wie key(y, m).
 * November 2026: Der Shelly misst erst seit 04.11. 19:25 – für den 1.–4.11. zeigte der Mitsubishi-Zähler 3123,9 → 3126,6 kWh,
 * also 2,7 kWh × 1,08 (er zeigt etwa 8 % weniger als der Shelly) ≈ 2,92 kWh. Wird zu dem addiert, was Home Assistant schickt,
 * darum schadet auch doppeltes Senden nicht.
 */
export const HEAT_TOPUP = { [key(2026, 10)]: 2.92 };

export function withHeatTopup(v) {
  const add = HEAT_TOPUP[key(v.y, v.m)];
  return add && v.heat != null ? { ...v, heat: round2(v.heat + add) } : v;
}

/** Fügt einen Monat ein oder ersetzt ihn; gibt neue, sortierte Daten zurück. */
export function upsertMonth(data, values, today = new Date()) {
  const months = data.months.filter(r => !(r.y === values.y && r.m === values.m));
  const old = data.months.find(r => r.y === values.y && r.m === values.m);
  // Schutz: Ein vorhandener Monat wird nicht durch deutlich kleinere Werte ersetzt – das wäre ein unvollständiger Monat,
  // z. B. weil die Zähler in Home Assistant erst mitten im Monat angelegt wurden.
  if (old && values.pv < old.pv * 0.9)
    throw new Error(`Monat ${values.m + 1}/${values.y}: neue Erzeugung ${values.pv} kWh ist viel kleiner als die gespeicherten ${old.pv} kWh – unvollständiger Monat? Nicht übernommen.`);
  const merged = { battIn: old?.battIn, battOut: old?.battOut, heat: old?.heat, cool: old?.cool, ...stripUndefined(values) };
  // Gleicher Schutz für die Klimaanlage: Ein vorhandener, deutlich größerer Wert (z. B. von Hand nachgetragen) bleibt stehen.
  // Hier ohne Abbruch, damit die übrigen Monatswerte trotzdem ankommen.
  if (old?.heat != null && values.heat != null && values.heat < old.heat * 0.9) { merged.heat = old.heat; merged.cool = old.cool; }
  months.push(withDerived(merged));
  months.sort((a, b) => a.y - b.y || a.m - b.m);
  return { updated: today.toISOString().slice(0, 10), months };
}

const stripUndefined = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));

/**
 * Prüft die Monatswerte, die Home Assistant schickt: { year, month (1–12), pv, imp, exp, battIn?, battOut?, heat?, cool? }.
 * Wirft bei allem, was nicht nach echten Messwerten aussieht – lieber kein Update als falsche Zahlen auf der Seite.
 */
export function validatePayload(p, now = new Date()) {
  if (!p || typeof p !== "object") throw new Error("Leere Nutzlast");
  const num = (name, { optional = false, max = 5000 } = {}) => {
    const v = p[name];
    if (v === undefined || v === null || v === "") { if (optional) return undefined; throw new Error(`„${name}“ fehlt`); }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`„${name}“ ist kein gültiger Monatswert: ${v}`);
    return n;
  };
  const year = Number(p.year), month = Number(p.month);
  if (!Number.isInteger(year) || year < 2019 || year > now.getFullYear()) throw new Error(`Ungültiges Jahr: ${p.year}`);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error(`Ungültiger Monat: ${p.month}`);
  if (year === now.getFullYear() && month > now.getMonth() + 1) throw new Error("Monat liegt in der Zukunft");
  const v = { y: year, m: month - 1, pv: num("pv"), imp: num("imp"), exp: num("exp"), battIn: num("battIn", { optional: true, max: 1000 }), battOut: num("battOut", { optional: true, max: 1000 }),
    heat: num("heat", { optional: true, max: 1500 }), cool: num("cool", { optional: true, max: 1500 }) };
  if (v.pv === 0 && v.imp === 0) throw new Error("Alle Werte 0 – Zähler noch ohne Vormonat?");
  if (v.exp > v.pv + 0.5) throw new Error("Einspeisung größer als Erzeugung – Sensoren vertauscht?");
  if (v.cool != null && v.heat == null) throw new Error("„cool“ ohne „heat“ – beide Klima-Werte zusammen schicken");
  if ((v.heat ?? 0) + (v.cool ?? 0) > v.pv + v.imp - v.exp + 1) throw new Error("Klimaanlage größer als der ganze Verbrauch – falscher Sensor?");
  for (const k of ["battIn", "battOut", "heat", "cool"]) if (v[k] === undefined) delete v[k];
  return v;
}
