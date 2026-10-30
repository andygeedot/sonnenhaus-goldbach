import type { RefKey } from "./types";

export const state = {
  y: 0,
  /** gewählter Monat im Regler (null = ganzes Jahr) */
  pm: null as number | null,
  /** angeklicktes Ding in der Zeichnung und welches von mehreren gleichen (Klimaanlage innen/außen) */
  info: null as string | null,
  hotIdx: 0,
  ref: "same" as RefKey,
  /** Womit die Klimaanlage verglichen wird: Gasheizung oder Luft-Wasser-Wärmepumpe */
  acCmp: "gas" as "gas" | "hp",
};

/** Wird in main.ts gesetzt – so können Module neu zeichnen lassen, ohne main zu importieren. */
export const app = { render: () => {} };
