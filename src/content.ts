// Quiz, Lexikon und die Einstellungen „Für Zahlen-Fans“.
import { TARIF } from "./config";
import { M, YEARS } from "./model";
import { app } from "./state";
import type { Assumptions, Stats, YearPrices } from "./types";
import { $, MONL, f1, f2 } from "./ui";

export function renderQuiz(s: Stats) {
  const P = M.P, A = M.A;
  const pv = s.months.map(r => r.pv), best = MONL[s.months[pv.indexOf(Math.max(...pv))].m];
  const Q: [string, string[], number, string][] = [
    ["Wie weit fährt ein E-Bike mit 1 kWh Strom?", ["ca. 8 km", "ca. 80 km", "ca. 800 km"], 1, `Etwa 80 km! Für 1 kWh zahlen wir ${f1.format(P[s.y].strom)} Cent. Günstiger kommt man kaum voran, außer mit reiner Muskelkraft. 💪`],
    ["Wie viel Wärme macht unsere Klimaanlage aus 1 kWh Strom?", ["1 kWh", "3–5 kWh", "20 kWh"], 1, "3 bis 5 kWh! Den Rest holt sie sich als Wärme aus der Außenluft. Ein Heizlüfter macht aus 1 kWh Strom nur 1 kWh Wärme."],
    ["In welchem Monat erntet unser Dach am meisten?", ["Dezember", "März", best], 2, `Im ${best}! Die Sonne steht dann hoch und scheint am längsten.`],
    ["Was ist mehr wert: Sonnenstrom selbst nutzen oder verkaufen?", ["Selbst nutzen", "Verkaufen", "Ist egal"], 0, `Selbst nutzen! Das spart ${f1.format(P[s.y].strom)} ct pro kWh, beim Verkaufen gibt es nur ${f2.format(A.feedIn)} ct.`],
  ];
  $("quizBox").innerHTML = Q.map(([q, o, c, a], i) => `<div class="card q" data-c="${c}"><h3>${i + 1}. ${q}</h3>
    <div class="opts">${o.map((x, j) => `<button data-j="${j}">${x}</button>`).join("")}</div><p class="ans" aria-live="polite">${a}</p></div>`).join("");
  $("quizBox").querySelectorAll<HTMLElement>(".q").forEach(q => q.addEventListener("click", e => {
    const t = e.target as HTMLElement, j = t.dataset.j;
    if (j == null || q.classList.contains("done")) return;
    q.classList.add("done");
    q.querySelectorAll<HTMLElement>("button").forEach(b => { if (b.dataset.j === q.dataset.c) b.classList.add("right"); else if (b === t) b.classList.add("wrong"); });
    if (j === q.dataset.c) q.querySelector(".ans")!.insertAdjacentHTML("afterbegin", "<b>Richtig! 🎉 </b>");
  }));
}

const LEX: [string, string, string, string][] = [
  ["⚡", "Kilowattstunde (kWh)", "Eine Mengeneinheit für Energie, wie Liter für Wasser. Mit 1 kWh kannst du etwa 60-mal ein Handy laden.", "Leistung × Zeit: Ein Gerät mit 1.000 Watt braucht in einer Stunde 1 kWh."],
  ["🔆", "Kilowatt-Peak (kWp)", "Wie stark unser Solardach höchstens sein kann, wenn die Sonne perfekt scheint. Unseres hat 9,52 kWp.", "In Deutschland erntet 1 kWp etwa 950–1.100 kWh pro Jahr, je nach Dachausrichtung und Wetter."],
  ["☀️", "Photovoltaik (PV)", "Die Solarplatten auf dem Dach. Sie verwandeln Sonnenlicht direkt in Strom, ganz ohne Lärm und Abgase.", "Solarzellen aus Silizium erzeugen Gleichstrom, den der Wechselrichter in Haushaltsstrom umwandelt."],
  ["🌡️", "Luft-Luft-Wärmepumpe", "Unsere Klimaanlage! Sie holt Wärme aus der Luft draußen und bläst sie als warme Luft ins Zimmer. Im Sommer geht's andersherum.", "Anders als eine Luft-Wasser-Wärmepumpe braucht sie keine Heizkörper. Die Jahresarbeitszahl (Wärme pro kWh Strom) liegt meist bei 3,5 bis 5."],
  ["🚿", "Durchlauferhitzer", "Ein kleines Gerät, das Wasser blitzschnell warm macht, genau in dem Moment, in dem es durchfließt.", "Elektrische Durchlauferhitzer haben meist 18–27 kW Leistung, laufen aber nur kurz. Es gibt keinen Speicher, der Wärme verliert."],
  ["🔋", "Batteriespeicher", "Ein großer Akku. Er sammelt mittags Sonnenstrom und gibt ihn abends wieder ab.", "Unsere Zendure-Batterie hat seit März 2026 5,76 kWh (2 × 2,88 kWh). Seitdem kommt im Sommer rund 90 % unseres Stroms vom eigenen Dach."],
  ["🏝️", "Autarkiegrad", "Wie viel von unserem Strom wir selbst machen. 100 % hieße: ganz unabhängig vom Stromnetz.", "Autarkie = selbst genutzter Sonnenstrom (direkt oder über die Batterie) ÷ gesamter Verbrauch."],
  ["🎁", "Einspeisung", "Strom, den wir nicht selbst brauchen, fließt ins Netz zu den Nachbarn. Dafür bekommen wir etwas Geld.", "Die Vergütung ist per Gesetz (EEG) für 20 Jahre festgelegt, bei uns 11,23 ct pro kWh."],
  ["🤝", "Genossenschaftsstrom", "Strom von einer Firma, die ihren Kundinnen und Kunden gemeinsam gehört, statt einem großen Konzern.", "Seit 2026 beziehen wir Ökostrom von Green Planet Energy eG: 30,5 ct pro kWh und 12,90 € Grundgebühr im Monat."],
  ["🌍", "CO₂", "Ein unsichtbares Gas, das beim Verbrennen von Gas, Öl, Kohle und Benzin entsteht. Zu viel davon heizt die Erde auf.", "Der deutsche Strommix verursacht je nach Jahr etwa 340–430 g CO₂ pro kWh, Tendenz fallend."],
];

export function renderLexikon() {
  $("lex").innerHTML = LEX.map(([e, t, k, a]) => `<div class="card"><div class="em">${e}</div><h3>${t}</h3><div class="kid"><b>Kurz gesagt:</b> ${k}</div><p class="adult">${a}</p></div>`).join("");
}

export function renderSettings() {
  const A = M.A, P = M.P;
  const fld = (k: keyof Assumptions, label: string, step: number) =>
    `<div><label for="a_${k}">${label}</label><input type="number" id="a_${k}" data-k="${k}" value="${A[k]}" step="${step}"></div>`;
  $("settings").innerHTML = fld("feedIn", "Einspeisevergütung (ct/kWh)", 0.01) + fld("jaz", "Jahresarbeitszahl unserer Klimaanlage", 0.1) +
    fld("jazRef", "Jahresarbeitszahl Neubau-Wärmepumpe", 0.1) + fld("boiler", "Wirkungsgrad Gaskessel", 0.01) +
    fld("oilEff", "Wirkungsgrad Ölkessel", 0.01) + fld("baseGas", "Grundgebühr Gas (€/Monat)", 0.5) +
    fld("wwKwh", "Warmwasser pro Jahr (kWh, 2 Personen)", 50) + fld("jazWW", "Arbeitszahl Wärmepumpe für Warmwasser", 0.1) +
    fld("hpInvest", "Luft-Wasser-Wärmepumpe mit Heizkörpern (€)", 500) + fld("hpFunding", "Förderung dafür (Anteil, 0,35 = 35 %)", 0.05) +
    fld("jazHp", "Jahresarbeitszahl dieser Wärmepumpe", 0.1) + fld("gasInvest", "Gasheizung mit Anschluss und Heizkörpern (€)", 500);
  const cols: [keyof YearPrices, string, number][] = [["strom", "Strom ct/kWh", 0.1], ["base", "Grundgeb. €/Monat", 0.1], ["gas", "Gas ct/kWh", 0.1], ["oil", "Öl ct/kWh", 0.1], ["co2", "Strommix g CO₂/kWh", 1]];
  $("priceTable").innerHTML = `<tr><th>Jahr</th>${cols.map(c => `<th>${c[1]}</th>`).join("")}</tr>` +
    YEARS.map(y => `<tr><td>${y}${TARIF[y] ? " 🌱" : ""}</td>${cols.map(([k, label, step]) =>
      `<td><input type="number" data-y="${y}" data-k="${k}" value="${P[y][k]}" step="${step}" aria-label="${label} ${y}"></td>`).join("")}</tr>`).join("");
  const onIn = (e: Event) => {
    const t = e.target as HTMLInputElement, v = parseFloat(t.value);
    if (isNaN(v) || v < 0 || (v === 0 && t.dataset.k !== "hpFunding")) return;   // Förderung darf 0 sein
    if (t.dataset.y) P[+t.dataset.y][t.dataset.k as keyof YearPrices] = v;
    else A[t.dataset.k as keyof Assumptions] = v;
    app.render();
  };
  $("settings").addEventListener("input", onIn);
  $("priceTable").addEventListener("input", onIn);
}
