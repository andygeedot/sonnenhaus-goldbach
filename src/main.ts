// Einstieg der Startseite. Schriften kommen aus dem eigenen Paket – kein Aufruf bei Google.
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./styles.css";

import { GOATCOUNTER, REFS } from "./config";
import { ENERGY, YEARS, SHOW_Y, st, yearRows } from "./model";
import { app, state } from "./state";
import { $, f0, setAll } from "./ui";
import { initScene, renderScene, setupRange } from "./scene";
import { initSections, renderBattery, renderCats, renderClimate, renderDots, renderMoney, renderMonths, renderPayback, renderYears } from "./sections";
import { renderLexikon, renderQuiz, renderSettings } from "./content";
import { initNav } from "./nav";
import type { RefKey } from "./types";

// Gezeigt wird immer ein Jahr (siehe SHOW_Y); das Vergleichshaus steht in der Adresse, damit man einen Link teilen kann
function readUrl() {
  state.y = SHOW_Y;
  const ref = new URLSearchParams(location.search).get("vergleich");
  if (ref && ref in REFS) state.ref = ref as RefKey;
}
function syncUrl() {
  const q = new URLSearchParams({ vergleich: state.ref });
  history.replaceState(null, "", `?${q}${location.hash}`);
}

function render() {
  setAll(".selY", state.y);
  const all = YEARS.map(y => st(yearRows(y))), s = all.find(x => x.y === state.y)!;
  setupRange(); renderScene(); renderYears(all);
  renderCats(s); renderDots(s); renderBattery(); renderMonths(s); renderMoney(all, s); renderPayback(); renderClimate(all, s); renderQuiz(s);
  $("fStand").textContent = `Stand: ${new Date(ENERGY.updated).toLocaleDateString("de-DE")}`;
  syncUrl();
}

// Besuche laut GoatCounter; bleibt unsichtbar, solange keine Zahl kommt (Zähler aus, offline, Werbeblocker)
async function showVisits() {
  try {
    const r = await fetch(`${GOATCOUNTER}/counter/TOTAL.json`);
    if (!r.ok) return;
    const j = await r.json() as { count?: string; count_unique?: string };
    const n = parseInt(String(j.count ?? j.count_unique ?? "").replace(/\D/g, ""), 10);
    if (!n) return;
    $("visitN").textContent = f0.format(n);
    $("visits").hidden = false;
  } catch { /* kein Zähler – kein Problem */ }
}

function start() {
  if (!ENERGY.months?.length) {
    $("main").innerHTML = `<div class="card loaderr"><h2>😕 Die Daten fehlen</h2>
      <p>In <code>data/energy.json</code> stehen keine Monatswerte. Neu erzeugen mit <code>npm run import:csv</code>.</p></div>`;
    return;
  }
  app.render = render;
  readUrl();
  initScene(); initSections(); initNav();
  showVisits();
  renderLexikon(); renderSettings();
  // erst zeichnen, wenn die Schriften da sind – sonst messen die Diagramme mit der falschen Schrift
  document.fonts.ready.then(render);
}

start();
