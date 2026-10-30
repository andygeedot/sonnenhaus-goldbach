// Daten der Seite: Monatswerte aus data/energy.json plus die (änderbaren) Annahmen und Preise.
import energy from "../data/energy.json";
import { DEFAULT_A, DEFAULT_P } from "./config";
import { prepare, stats } from "./calc";
import type { Model, Month, RawMonth, RefKey } from "./types";
import { state } from "./state";

export const ENERGY = energy as { updated: string; months: RawMonth[] };
const prepared = prepare(ENERGY.months);

export const DATA = prepared.data;
export const YEARS = prepared.years;
export const FIRST = prepared.first;
export const LAST = prepared.last;
export const BATT_START = prepared.battStart;
export const FULL_YEARS = prepared.fullYears;
/** Das Jahr, das die Seite zeigt: 2026 (unser erstes Jahr mit Batterie und eigenem Tarif), danach immer das letzte komplette Jahr. */
export const SHOW_Y = Math.min(LAST.y, Math.max(2026, FULL_YEARS[FULL_YEARS.length - 1] ?? 0));

export const M: Model = {
  data: DATA, shape: prepared.shape,
  A: { ...DEFAULT_A },
  P: Object.fromEntries(Object.entries(DEFAULT_P).map(([y, p]) => [y, { ...p }])),
};

export const yearRows = (y: number) => DATA.filter(r => r.y === y);
/** Statistik mit dem gerade gewählten Vergleichshaus (oder einem bestimmten). */
export const st = (rows: Month[], ref: RefKey = state.ref) => stats(M, rows, ref);
