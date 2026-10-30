// Formatierung und kleine DOM-Helfer.
import { FIRST, LAST } from "./model";

export const f0 = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
export const f1 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const f2 = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur = (v: number) => f0.format(v) + " €";
export const MON = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
export const MONL = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export const $ = <T extends Element = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;
export const setAll = (sel: string, txt: string | number) => document.querySelectorAll(sel).forEach(e => (e.textContent = String(txt)));
export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Erstes Jahr (ab März 2019) und laufendes Jahr sind unvollständig. */
export const partial = (y: number) => (y === LAST.y && LAST.m < 11) || (y === FIRST.y && FIRST.m > 0);
export const yLabel = (y: number) => partial(y) ? `${y}*` : String(y);
export const chipLabel = (y: number) =>
  y === FIRST.y && FIRST.m > 0 ? `${y} (ab ${MON[FIRST.m]})` : y === LAST.y && LAST.m < 11 ? `${y} (bis ${MON[LAST.m]})` : String(y);

/** Zahl sanft hochzählen lassen. */
export function count(el: HTMLElement, to: number, fmt: { format(v: number): string } = f0) {
  const from = +(el.dataset.v || 0);
  el.dataset.v = String(to);
  if (reduced) { el.textContent = fmt.format(to); return; }
  const t0 = performance.now(), d = 600;
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt.format(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
