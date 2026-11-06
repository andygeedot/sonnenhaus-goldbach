/** Ein Monat, wie er in data/energy.json steht (kWh; m: 0 = Januar). */
export interface RawMonth {
  y: number; m: number;
  pv: number; imp: number; exp: number; cons: number; direct: number;
  battIn?: number; battOut?: number;
  /** von der Klimaanlage gemessen (seit Nov. 2026), getrennt nach Heizen und Kühlen */
  heat?: number; cool?: number;
}

/** Monat mit abgeleiteten Werten für die Seite. */
export interface Month extends RawMonth {
  battIn: number; battOut: number;
  /** Sonnenstrom, der ohne Umweg über die Batterie verbraucht wurde */
  fromRoof: number;
  /** Heizstrom (gemessen oder geschätzt), Kühlen (nur gemessen, sonst 0) und Rest (Haushalt inkl. Warmwasser) */
  heat: number; cool: number; home: number;
  /** true, wenn heat/cool vom Zähler an der Klimaanlage stammen */
  heatMeasured: boolean;
}

export interface YM { y: number; m: number }

export type RefKey = "same" | "avg" | "old" | "new";
export type Fuel = "gas" | "oil" | "hp";
export interface RefHouse { icon: string; name: string; short: string; desc: string; kwhm2?: number; fuel: Fuel }

export interface YearPrices { strom: number; base: number; gas: number; oil: number; co2: number }
export type Prices = Record<number, YearPrices>;

export interface Assumptions {
  feedIn: number; jaz: number; jazRef: number; jazWW: number; wwKwh: number;
  boiler: number; oilEff: number; baseGas: number; gasCO2: number; oilCO2: number;
  treeKg: number; carKg: number; bikeKwhPerKm: number;
  /** Alternative zur Klimaanlage: Luft-Wasser-Wärmepumpe mit Heizkörpern (Anschaffung €, Förderanteil, Jahresarbeitszahl) */
  hpInvest: number; hpFunding: number; jazHp: number;
  /** Alternative Gasheizung: Anschaffung € (Brennwertkessel, Gasanschluss, Heizkörper und Rohre) */
  gasInvest: number;
}

export interface Invest { key: "pv" | "ac" | "batt"; date: string; icon: string; c: string; title: string; cost: number; from: YM }

export interface RefTotals { heat: number; ww: number; fuel: number; home: number; elec: number; heatCost: number; heatCO2: number; elecCost: number; cost: number; co2: number }

export interface Stats {
  n: number; months: Month[]; y: number;
  pv: number; cons: number; imp: number; exp: number; direct: number; battIn: number; battOut: number; fromRoof: number; heat: number; cool: number; home: number;
  /** Monate mit gemessenem Heizstrom */
  measuredN: number;
  autarky: number; heatUseful: number;
  ourCost: number; ourCO2: number;
  solarGain: number; battGain: number; acGain: number; pvGain: number;
  /** Betriebskosten-Vorteil der Klimaanlage gegenüber einer Luft-Wasser-Wärmepumpe (€, negativ = Wärmepumpe billiger) */
  acRunVsHp: number;
  ref: RefTotals; saved: number;
  co2Heat: number; co2Grid: number; co2Exp: number; co2: number;
}

/** Alles, was die Rechnungen brauchen – so lassen sie sich auch ohne Seite testen. */
export interface Model { data: Month[]; shape: number[]; A: Assumptions; P: Prices }
