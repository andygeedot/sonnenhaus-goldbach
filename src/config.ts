import type { Assumptions, Invest, Prices, RefHouse, RefKey } from "./types";

export const HOUSE = { area: 74, kwp: 9.52, people: 2, town: "Goldbach" };

export const INVEST: Invest[] = [
  { key: "pv", date: "März 2019", icon: "☀️", c: "var(--sun)", title: "Solardach 9,52 kWp", cost: 11500, from: { y: 2019, m: 2 } },
  { key: "ac", date: "2020", icon: "❄️", c: "var(--heat)", title: "Klimaanlage Mitsubishi Diamond MSZ-LN25", cost: 3500, from: { y: 2020, m: 0 } },
  { key: "batt", date: "15. Dez. 2025", icon: "🔋", c: "var(--battery)", title: "Zendure-Batterie 2,88 kWh", cost: 869, from: { y: 2025, m: 11 } },
  { key: "batt", date: "März 2026", icon: "🔋", c: "var(--battery)", title: "Batterie-Erweiterung +2,88 kWh", cost: 509, from: { y: 2026, m: 2 } },
];
/** Ab hier heizt die Klimaanlage; davor direkt mit Strom (1 kWh Strom = 1 kWh Wärme). */
export const AC_FROM = INVEST[1].from;

// Annahmen (auf der Seite unter „Für Zahlen-Fans“ änderbar)
export const DEFAULT_A: Assumptions = {
  feedIn: 11.23, jaz: 4.0, jazRef: 3.2, jazWW: 2.5,
  wwKwh: 1000, // 2 Personen × ~40 l warmes Wasser/Tag
  boiler: 0.92, oilEff: 0.88, baseGas: 16,
  gasCO2: 0.201, oilCO2: 0.266, treeKg: 10, carKg: 0.15, bikeKwhPerKm: 0.012,
  // Luft-Wasser-Wärmepumpe 2020 statt Klimaanlage: Gerät + Einbau + Heizkörper und Rohre (das Haus hatte vorher Stromheizung,
  // also kein Wasser-Heizsystem), grob 25.000 €; damals 35 % Förderung (BAFA); im Bestand mit Heizkörpern JAZ ≈ 3
  hpInvest: 25000, hpFunding: 0.35, jazHp: 3.0,
  // Gasheizung 2020 statt Klimaanlage: Brennwertkessel mit Einbau, Gasanschluss, Heizkörper und Rohre, grob 16.000 €;
  // reine Gasheizungen wurden 2020 nicht mehr gefördert
  gasInvest: 16000,
};

// Strom (ct/kWh) und Grundgebühr (€/Monat): bis 2025 Durchschnittswerte, 2026 unser Tarif
export const DEFAULT_P: Prices = {
  2019: { strom: 30.5, base: 13.0, gas: 6.3, oil: 6.7, co2: 411 },
  2020: { strom: 31.5, base: 13.0, gas: 6.1, oil: 5.0, co2: 369 },
  2021: { strom: 32.2, base: 13.0, gas: 7.0, oil: 7.0, co2: 410 },
  2022: { strom: 40.1, base: 14.0, gas: 13.5, oil: 14.0, co2: 433 },
  2023: { strom: 45.7, base: 15.0, gas: 12.0, oil: 10.7, co2: 380 },
  2024: { strom: 41.0, base: 15.0, gas: 10.5, oil: 10.0, co2: 363 },
  2025: { strom: 39.7, base: 15.0, gas: 10.2, oil: 9.5, co2: 352 },
  2026: { strom: 30.5, base: 12.9, gas: 10.0, oil: 9.5, co2: 340 },
};
/** Besucherzähler (ohne Cookies), die Zahl zeigt die Startseite oben rechts */
export const GOATCOUNTER = "https://andygeedot.goatcounter.com";

export const TARIF: Record<number, string> = { 2026: "Green Planet Energy" };

export const REFS: Record<RefKey, RefHouse> = {
  same: { icon: "🔥", name: "Wie unser Haus, mit Gas", short: "Unser Haus mit Gas", desc: "Gleicher Wärmebedarf wie bei uns, aber Gasheizung und kein Solardach.", fuel: "gas" },
  avg: { icon: "🏘️", name: "Durchschnitt Deutschland", short: "Durchschnitt (Gas)", desc: "Typischer Altbestand: ca. 130 kWh Wärme pro m² und Jahr, Gasheizung, kein Solardach.", kwhm2: 130, fuel: "gas" },
  old: { icon: "🛢️", name: "Unsanierter Altbau", short: "Altbau (Öl)", desc: "Alte Fenster, kaum Dämmung: ca. 200 kWh pro m², Ölheizung, kein Solardach.", kwhm2: 200, fuel: "oil" },
  new: { icon: "🏗️", name: "Neubau mit Wärmepumpe", short: "Neubau (WP)", desc: "Gut gedämmt: ca. 45 kWh pro m², Luft-Wasser-Wärmepumpe, aber kein Solardach.", kwhm2: 45, fuel: "hp" },
};
