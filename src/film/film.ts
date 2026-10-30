// „Das Sonnenhaus von Goldbach“ – eine kleine Comic-Doku, die in einer Schleife läuft.
// Eine durchgehende GSAP-Zeitleiste steuert Kamera, Figuren und Einblendungen; die Zahlen kommen aus den echten Daten.
import "@fontsource/bangers/400.css";
import "@fontsource/comic-neue/700.css";
import "./film.css";

import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { facts } from "../kiosk/facts";
import { MONL, f0, f1 } from "../ui";
import { boom, hudSvg, tspans, wrap } from "./hud";
import { stromi, worldSvg } from "./world";
import { Sound, type Sfx } from "./audio";

gsap.registerPlugin(MotionPathPlugin);

const F = facts();
const NIGHT = { from: 21, to: 6 };      // nachts wird das Bild gedimmt
const RELOAD_H = 6;                      // regelmäßig neu laden: neue Monatswerte, kein Speicherstau
const VOLUME = .8;                       // Gesamtlautstärke 0–1
const LOOP = new URLSearchParams(location.search).has("loop");   // ?loop: Außen-Display – endlos, nachts stumm

// ---------- Bühne: eine SVG-Fläche 1920 × 1080, Welt (mit Kamera) + feste Ebene darüber ----------
const svg = document.getElementById("film") as unknown as SVGSVGElement;
const treeCount = Math.min(46, Math.max(10, Math.round(F.trees / 8)));
// Beschnitt auf 1920 × 1080 – sonst ragt die Welt bei anderem Seitenverhältnis in die Ränder.
// Ein inneres <svg> schneidet einfach rechteckig ab; ein clip-path über alles flackert in Chrome/Samsung auf Android.
svg.innerHTML = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" overflow="hidden">
  <g id="world">${worldSvg(treeCount)}</g><g id="hud">${hudSvg(F)}</g></svg>`;
const q = <T extends Element = SVGGraphicsElement>(sel: string) => svg.querySelector(sel) as T;
const qa = (sel: string) => [...svg.querySelectorAll<SVGGraphicsElement>(sel)];

// Kamera: schaut auf Welt-Punkt (x, y) mit Zoom z
const cam = { x: 1700, y: 300, z: .6 };
const world = q("#world");
gsap.ticker.add(() => world.setAttribute("transform", `translate(960 540) scale(${cam.z}) translate(${-cam.x} ${-cam.y})`));

// ---------- dauerhafte Bewegungen (laufen immer, die Zeitleiste blendet nur ein und aus) ----------
gsap.to("#wsun .rays", { rotation: 360, svgOrigin: "0 0", duration: 40, repeat: -1, ease: "none" });
gsap.to("#fan", { rotation: 360, svgOrigin: "-20 -65", duration: 1, repeat: -1, ease: "none" });
gsap.to(".hpfan", { rotation: 360, svgOrigin: "-20 0", duration: 1, repeat: -1, ease: "none" });
gsap.to("#cloud1", { x: -260, duration: 60, repeat: -1, yoyo: true, ease: "sine.inOut" });
gsap.to("#cloud2", { x: 220, duration: 70, repeat: -1, yoyo: true, ease: "sine.inOut" });
gsap.to("#warmAir path", { y: 14, opacity: .2, duration: 1, repeat: -1, yoyo: true, stagger: .2, ease: "sine.inOut" });
gsap.to(".airIn, .airOut", { x: 22, duration: .8, repeat: -1, yoyo: true, ease: "sine.inOut" });
// Sunny blinzelt ab und zu
gsap.to("#sunnyFace .eye, #wsun .eye", { scaleY: .1, transformOrigin: "50% 50%", duration: .08, repeat: -1, yoyo: true, repeatDelay: 3.4 });
// Regen fällt schräg, Schnee rieselt – die Schleifen laufen nur, solange Regen bzw. Schnee zu sehen ist (siehe unten)
const rainLoop = gsap.timeline({ paused: true }), snowLoop = gsap.timeline({ paused: true });
qa(".drop").forEach((d, i) => rainLoop.add(gsap.fromTo(d, { y: -80 - (i % 13) * 85 }, { y: 1120, x: "-=60", duration: .7 + (i % 5) * .08, repeat: -1, ease: "none", delay: -(i % 9) * .1 }), 0));
qa(".flake").forEach((fl, i) => snowLoop.add(gsap.fromTo(fl, { y: -40 - (i % 9) * 110 }, { y: 1100, x: `+=${(i % 5) * 18 - 36}`, duration: 5 + (i % 7) * .6, repeat: -1, ease: "none", delay: -(i % 11) * .5 }), 0));

// Weniger Zeichenarbeit fürs Handy (sonst flackert es auf großen 120-Hz-Bildschirmen wie dem Galaxy Fold):
// Ebenen mit Deckkraft 0 werden ganz ausgeblendet statt unsichtbar mitgezeichnet; Regen und Schnee stehen still, solange man sie nicht sieht.
const fades = qa("#night, #stars, #rain, #snow, #snowRoof, #snowGround, #rainbow, #flash, #bolt");
const loops = new Map<Element, gsap.core.Timeline>([[q("#rain"), rainLoop], [q("#snow"), snowLoop]]);
gsap.ticker.add(() => {
  for (const el of fades) {
    const on = Number(gsap.getProperty(el, "opacity")) > 0.001;
    if ((el.style.visibility !== "hidden") !== on) el.style.visibility = on ? "" : "hidden";
    const loop = loops.get(el);
    if (loop && loop.paused() === on) loop.paused(!on);
  }
});
// Touch-Geräte: 30 Bilder pro Sekunde reichen für den Comic und halbieren (bei 120 Hz: vierteln) die Arbeit
if (matchMedia("(pointer: coarse)").matches) gsap.ticker.fps(30);

// Katzen: Schwanz wedelt, ab und zu blinzeln
qa(".cat .ctail").forEach((t, i) => gsap.to(t, { rotation: 14, transformOrigin: "0% 100%", duration: 1.1 + i * .3, repeat: -1, yoyo: true, ease: "sine.inOut" }));
gsap.to(".cat .ceyes", { scaleY: .1, transformOrigin: "50% 50%", duration: .09, repeat: -1, yoyo: true, repeatDelay: 2.7, stagger: .8 });

// ---------- Ton ----------
// Musik läuft auf der ganzen Seite (auch beim Runterscrollen); Geräusche nur, solange der Film läuft.
const snd = new Sound(VOLUME);
// Nur am Außen-Display (?loop) ist der Ton nachts aus – wegen der Nachbarn.
const quiet = () => { const h = new Date().getHours(); return LOOP && (h >= NIGHT.from || h < NIGHT.to); };
let soundReady = false, gateOpen = false;
/** Gibt den Ton frei. Muss direkt in einem Klick/Tipp passieren (Safari, iPhone). */
function startSound() {
  if (quiet()) { snd.setVolume(0); return; }
  snd.setVolume(VOLUME);
  const ready = snd.unlock();
  if (soundReady) return;
  ready.then(() => { if (snd.running && !soundReady) { soundReady = true; snd.start(); document.getElementById("cMusic")?.classList.remove("wait"); } }).catch(() => { /* nächster Klick */ });
}
// Der erste Tipp, Klick oder Tastendruck irgendwo auf der Seite startet die Musik
for (const ev of ["pointerdown", "pointerup", "touchend", "click", "keydown"]) document.addEventListener(ev, startSound, { capture: true });

/** Start-Bildschirm: Titelbild im Hintergrund, großer Knopf „Film starten“. */
function openGate() {
  gateOpen = true;
  setPaused(true);
  // direkt setzen: während der Pause laufen keine Tweens. visibility statt nur opacity – unsichtbare Knöpfe dürfen keine Klicks fangen
  Object.assign(q("#soundGate").style, { pointerEvents: "auto", visibility: "visible", opacity: "1" });
}
function closeGate() {
  gateOpen = false;
  startSound();
  q("#soundGate").style.pointerEvents = "none";
  userPaused = false; autoPaused = false;
  setPaused(false);
  gsap.to("#soundGate", { autoAlpha: 0, duration: .3 });
  tl.restart();
}

// Mauszeiger nur zeigen, solange die Maus bewegt wird
let mouseTimer = 0;
document.addEventListener("mousemove", () => {
  document.body.classList.add("mouse");
  clearTimeout(mouseTimer);
  mouseTimer = window.setTimeout(() => document.body.classList.remove("mouse"), 3000);
});
const sfx = (t: number, name: Sfx) => tl.call(() => snd.play(name), [], t);

// Strom-Männchen laufen an den Leitungen entlang – alle gleich schnell, aber so viele, wie Strom fließt:
// Pro Sekunde passieren eine Stelle so viele Männchen, wie die Leitung Kilowattstunden im Jahr trägt (je 1.400 kWh eins).
const SPEED = 230;       // Welt-Pixel pro Sekunde
const KWH_PER_STROMI = 1400;
function stream(pathId: string, color: string, kwhPerYear: number) {
  const path = q<SVGPathElement>(`#${pathId}`), len = path.getTotalLength(), dur = len / SPEED;
  const perSec = kwhPerYear / KWH_PER_STROMI;
  const n = Math.max(1, Math.round(perSec * dur));
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("opacity", "0");
  g.innerHTML = Array.from({ length: n }, () => stromi(color)).join("");
  q("#streams").appendChild(g);
  [...g.children].forEach((s, i) => gsap.to(s, {
    motionPath: { path, align: path, alignOrigin: [.5, .5] },
    // alle mit negativer Verzögerung, auch das erste: sonst wartet es (Film pausiert am Startbildschirm) am Nullpunkt
    // und taucht später neben seinem Weg auf – als Stromi, der aus dem Nichts fällt
    duration: dur, repeat: -1, ease: "none", delay: -((i + .5) * dur) / n,
  }));
  return g;
}
const FL = F.flows;
const S = {
  gridAll: stream("pGrid", "#c8cfd8", FL.gridAll),
  grid: stream("pGrid", "#c8cfd8", FL.grid),
  gridBatt: stream("pGrid", "#c8cfd8", FL.gridBatt),
  sun: stream("pSun", "#ffd43b", FL.sun),
  roof: stream("pRoof", "#ffd43b", FL.roof),
  exp: stream("pExp", "#ffd43b", FL.exp),
  battIn: stream("pBattIn", "#2bc4b4", FL.battIn),
  battOut: stream("pBattOut", "#2bc4b4", FL.battOut),
};

// Bäume an ihren Platz stellen
qa("#trees .tree").forEach(t => gsap.set(t, { x: +t.dataset.x!, y: +t.dataset.y!, scale: 0, transformOrigin: "50% 100%" }));

// ---------- Erzähl-Kasten und Sprechblase ----------
const capHeight = (text: string) => 70 + wrap(text, 40).length * 46 + 26;
function setCap(kick: string, text: string) {
  q("#capK").textContent = kick.toUpperCase();
  q("#capT").innerHTML = tspans(wrap(text, 40), 68, 46);
}
function setSay(text: string) {
  const lines = wrap(text, 30), w = Math.min(640, Math.max(...lines.map(l => l.length)) * 18 + 64), h = lines.length * 42 + 46;
  const x1 = 1700, x0 = x1 - w, y0 = 120, y1 = y0 + h, r = 26, ty = y1 - 36;
  q("#sayBg").setAttribute("d", `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${ty - 14} L${x1 + 46} ${ty + 34} L${x1} ${ty + 14} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0}Z`);
  const t = q("#sayT");
  t.setAttribute("y", String(y0 + 46));
  t.innerHTML = tspans(lines, x0 + 32, 42);
}

// ---------- Zeitleiste ----------
const tl = gsap.timeline({ repeat: LOOP ? -1 : 0, defaults: { ease: "power2.inOut" }, onComplete: () => showEndButtons(true) });
if (import.meta.env.DEV) (window as unknown as { tl: gsap.core.Timeline }).tl = tl;   // nur lokal: Zeitleiste zum Nachprüfen

// Neuer Erzähl-Text: Der Kasten bleibt stehen, nur der Text blendet über und der Kasten wächst mit (kein Flackern)
function cap(t: number, kick: string, text: string) {
  tl.to("#capK, #capT", { opacity: 0, duration: .2, ease: "none" }, t - .2)
    .call(setCap, [kick, text], t)
    .to("#capBg, #capShadow", { attr: { height: capHeight(text) }, duration: .35, ease: "back.out(1.6)" }, t)
    .to("#capK, #capT", { opacity: 1, duration: .3, ease: "none" }, t + .05)
    .to("#cap", { opacity: 1, y: 0, duration: .5, ease: "back.out(2)" }, t);
}
/**
 * Volti spricht. keep: Blase bleibt danach offen, weil gleich der nächste Satz kommt;
 * follow: Blase ist schon offen, nur der Text wechselt.
 */
function say(t: number, text: string, dur = 4.5, o: { keep?: boolean; follow?: boolean } = {}) {
  sfx(t, "blip");
  if (o.follow) {
    tl.to("#sayT", { opacity: 0, duration: .15, ease: "none" }, t - .15)
      .call(setSay, [text], t)
      .to("#sayT", { opacity: 1, duration: .2, ease: "none" }, t)
      .fromTo("#sayBox", { scale: .96 }, { scale: 1, transformOrigin: "100% 0%", duration: .35, ease: "back.out(3)" }, t);
  } else {
    tl.call(setSay, [text], t)
      .fromTo("#sayBox", { opacity: 0, scale: .6, transformOrigin: "100% 0%" }, { opacity: 1, scale: 1, duration: .45, ease: "back.out(2.5)" }, t);
  }
  tl.fromTo("#sunnyFace .mouth", { scaleY: 1 }, { scaleY: .25, transformOrigin: "50% 50%", duration: .14, repeat: 9, yoyo: true, ease: "none" }, t)
    .fromTo("#sunny", { y: 0 }, { y: -12, duration: .3, repeat: 3, yoyo: true, ease: "sine.inOut" }, t);
  if (!o.keep) tl.to("#sayBox", { opacity: 0, duration: .3 }, t + dur);
}
function shot(t: number, x: number, y: number, z: number, dur = 2.5, ease = "power2.inOut") {
  tl.to(cam, { x, y, z, duration: dur, ease }, t);
}
let boomN = 0;
const BANG_SFX: Record<string, Sfx> = { "KLONK!": "klonk", "PLING!": "pling", "WUSCH!": "whoosh", "SSSST!": "zip", "NÖ!": "honk", "BZZZT!": "buzz", "PLOPP!": "plop", "MIAU!": "meow", "TÖFF TÖFF!": "honk", "SUMMM!": "zip", "BALD!": "pling", "HOPP!": "plop" };
function bang(t: number, word: string, x: number, y: number, rot = -8, fill?: string, size?: number) {
  const id = `b${boomN++}`;
  if (BANG_SFX[word]) sfx(t, BANG_SFX[word]);
  q("#booms").insertAdjacentHTML("beforeend", boom(id, word, x, y, rot, fill, size));
  tl.set(`#${id}`, { opacity: 1 }, t)
    .fromTo(`#${id} .bi`, { scale: 0 }, { scale: 1, transformOrigin: "50% 50%", duration: .45, ease: "back.out(3)" }, t)
    .to(`#${id}`, { opacity: 0, duration: .4 }, t + 1.4);
}
function inset(t: number, id: string, until: number) {
  tl.set(`#${id}`, { opacity: 1 }, t)
    .fromTo(`#${id} .ii`, { scale: .3, rotation: -6, transformOrigin: "50% 50%" }, { scale: 1, rotation: 0, duration: .6, ease: "back.out(2)" }, t)
    .to(`#${id} .ii`, { scale: .3, opacity: 0, duration: .4, ease: "back.in(2)" }, until)
    .set(`#${id}`, { opacity: 0 }, until + .4).set(`#${id} .ii`, { opacity: 1 }, until + .4);
}
function counter(t: number, id: string, to: number, dur: number, fmt: (v: number) => string) {
  const o = { v: 0 };
  tl.set(o, { v: 0 }, 0).call(() => { q(`#${id}`).textContent = fmt(0); }, [], 0)
    .to(o, { v: to, duration: dur, ease: "power1.out", onUpdate: () => { q(`#${id}`).textContent = fmt(o.v); } }, t);
}
const show = (t: number, el: Element | string, dur = .8) => tl.to(el, { opacity: 1, duration: dur }, t);
const sky = (t: number, fill: string, dur = 2) => tl.to("#sky", { fill, duration: dur }, t);
const sunTo = (t: number, x: number, y: number, dur = 2.5, ease = "power2.inOut") => tl.to("#wsunpos", { x, y, duration: dur, ease }, t);

// ---- Startzustand (wird bei jeder Wiederholung neu gesetzt) ----
tl.set(cam, { x: 1700, y: -150, z: .62 }, 0)
  .set("#sky", { fill: "#b8c4cf" }, 0)
  .set("#wsunpos", { x: 1650, y: 1250 }, 0)
  .set("#panels .panel", { y: -700, opacity: 0 }, 0)
  .set(".nw", { fill: "#c8cfd8" }, 0)
  .set("#acIn, #acOut, #battery", { opacity: 0, scale: .4, transformOrigin: "50% 100%" }, 0)
  .set("#bike", { x: -900, y: 900 }, 0)
  .set("#trees .tree", { scale: 0 }, 0)
  .set(Object.values(S), { opacity: 0 }, 0)
  .set("#bfill", { scaleY: .6, transformOrigin: "50% 100%" }, 0)
  .set("#night, #stars, #snow, #snowRoof, #snowGround, #cap, #sayBox, #title, #end", { opacity: 0 }, 0)
  .set("#cap", { y: -10 }, 0).set("#capK, #capT, #sayT", { opacity: 1 }, 0)
  .set(".ybar", { opacity: 0, scaleY: 0, transformOrigin: "50% 100%" }, 0)
  .set(".cross", { scale: 0, transformOrigin: "50% 50%" }, 0)
  .set("#ringPrev, #ringCur", { attr: { "stroke-dasharray": "0 100" } }, 0)
  .set("#sunnyPos", { x: 260 }, 0)
  .set("#iris", { attr: { r: 0 } }, 0)
  .set("#oldCar", { x: 700, y: 900 }, 0).set("#eCar", { x: -900, y: 900 }, 0).set("#oldCar .smoke", { opacity: 0 }, 0)
  .set(".still", { scale: 0, transformOrigin: "50% 50%" }, 0).set("#machmit", { opacity: 0 }, 0)
  .call(() => showEndButtons(false), [], 0);
tl.call(() => snd.mood(false), [], 0);
tl.set("#storm", { x: 1900 }, 0).set("#rain, #flash, #bolt, #rainbow", { opacity: 0 }, 0)
  .call(() => { snd.stopLoop("fan", .2); snd.stopLoop("rain", .2); }, [], 0);

// ---- 0:00 Titel: Kreis öffnet sich, Kamera schwebt vom Himmel herab ----
// Die Blende (Maske über dem ganzen Bild) nur zeigen, solange sie zu ist – offen kostet sie auf Android jedes Bild Rechenzeit
tl.set("#irisCover", { display: "inline" }, 0);
tl.to("#iris", { attr: { r: 1250 }, duration: 1.6, ease: "power2.out" }, .2).set("#irisCover", { display: "none" }, 1.85);
sfx(.2, "whoosh");
sfx(.9, "tada");
tl.set("#title", { opacity: 1 }, .9).fromTo("#title .ti", { scale: .2, rotation: -8, transformOrigin: "50% 50%" }, { scale: 1, rotation: -2, duration: .9, ease: "back.out(2)" }, .9);
shot(1, 1700, 560, .55, 6, "power1.inOut");
tl.to("#title .ti", { scale: .5, opacity: 0, duration: .5, ease: "back.in(2)" }, 6.2).set("#title", { opacity: 0 }, 6.8).set("#title .ti", { opacity: 1 }, 6.8);

// ---- 0:07 Früher ----
show(6.5, S.gridAll);
shot(6.8, 1380, 640, 1.2, 3);
cap(7.4, "Goldbach, früher", "Ein kleines Haus mit 74 m². Hier wohnen zwei Menschen und drei Katzen – und der ganze Strom kommt aus dem Netz.");
bang(9.6, "MIAU!", 1000, 470, 8, "#ffc2d4", 46);
tl.to("#sunnyPos", { x: 0, duration: .8, ease: "back.out(1.6)" }, 11);
say(11.4, "Hallo! Ich bin Volti, ein kleines Stromteilchen. Kommt mit!", 4);

// ---- 0:17 März 2019: die Sonne zieht ein ----
cap(17, "März 2019", "Auf das Dach kommen Solarmodule mit 9,52 Kilowatt-Peak – ein kleines Kraftwerk!");
sky(17, "#86c8f2", 2.5);
sunTo(17, 1650, 300, 3, "power2.out");
shot(17.5, 1650, 400, 1.4, 2.5);
qa("#panels .panel").forEach((p, i) => {
  sfx(20.15 + i * .42, "tick");
  tl.to(p, { y: 0, opacity: 1, duration: .55, ease: "bounce.out" }, 19.6 + i * .42);
});
bang(20.2, "KLONK!", 520, 420, -10);
bang(21.4, "KLONK!", 1180, 640, 8, "#ffb03b", 58);
show(22.4, S.sun, .6); show(22.8, S.roof, .6);
say(22.8, "Das Dach fängt Sonnenstrahlen – und macht uns Stromis daraus!", 4.2);
inset(24.2, "insPv", 30.8);
counter(24.6, "cntPv", Math.round(F.avgPv / 100) * 100, 2.2, v => f0.format(v));
tl.to(S.gridAll, { opacity: 0, duration: 1.2 }, 25).to(S.grid, { opacity: 1, duration: 1.2 }, 25);

// ---- 0:31 Mittags: wir teilen ----
shot(31, 2150, 640, .95, 3);
cap(31.4, "Mittags", `Mehr Sonne, als wir brauchen? Der Rest fließt über das Netz zu den Nachbarn – genug für ${f0.format(F.households)} Haushalte.`);
show(32.6, S.exp, .6);
qa(".nw").forEach((w, i) => tl.to(w, { fill: "#ffe08a", duration: .25 }, 34 + Math.floor(i / 2) * .6));
bang(34.1, "PLING!", 1470, 420, 6, "#fff36b", 54);
bang(35.3, "PLING!", 1700, 470, -6, "#fff36b", 54);
say(36, "Je mehr von uns flitzen, desto mehr Strom fließt!", 3.8);

// ---- 0:41 2020: Heizen mit Luft ----
shot(41, 1640, 700, 1.6, 2.6);
cap(41.2, "2020", "Geheizt wird mit Luft: Die Klimaanlage ist eine Wärmepumpe. Sie holt Wärme aus der Luft draußen – sogar bei Frost.");
tl.to("#acOut", { opacity: 1, scale: 1, duration: .6, ease: "back.out(2.5)" }, 43);
tl.call(() => snd.startLoop("fan"), [], 43).call(() => snd.stopLoop("fan", 1.5), [], 54.4);
bang(43.1, "WUSCH!", 1520, 640, -8, "#7fd3ff", 62);
tl.to("#acIn", { opacity: 1, scale: 1, duration: .6, ease: "back.out(2.5)" }, 44.2);
inset(45.4, "insHP", 54);
say(47, "Aus 1 kWh Strom macht sie 4 kWh Wärme!", 4.4);

// ---- 0:55 Alles mit Strom ----
shot(54.6, 1200, 720, 1.15, 3);
cap(55, "Bei uns", "Heizen, warmes Wasser, Kochen und Radfahren – alles läuft mit Strom. Nur unser Auto tankt leider noch Benzin.");
tl.to("#bike", { x: 980, duration: 2.4, ease: "power3.out" }, 56)
  .to("#wheel1, #wheel2", { rotation: 720, svgOrigin: "0 0", duration: 2.4, ease: "power3.out" }, 56);
bang(56.3, "SSSST!", 900, 560, -6, "#d7c8ff", 56);
inset(58, "insNope", 65.9);
qa(".cross").forEach((c, i) => {
  sfx(59.4 + i * .9, "tick");
  tl.to(c, { scale: 1, duration: .35, ease: "back.out(3)" }, 59.4 + i * .9);
});
bang(61.4, "NÖ!", 790, 420, 10, "#ff8a7a", 56);
tl.to(".still", { scale: 1, duration: .4, ease: "back.out(3)" }, 61.6);
sfx(61.6, "pling");
say(61.6, "Kein Öl, kein Gas – im Haus läuft alles mit Strom!", 4.2);

// ---- 1:07 Ein Jahr im Zeitraffer ----
shot(66.6, 1500, 560, .78, 3);
cap(67, "Ein Jahr im Zeitraffer", `Im ${MONL[F.best.m]} erntet das Dach ${f0.format(F.best.pv / F.worst.pv)}-mal so viel wie im ${MONL[F.worst.m]} – und im Winter heizen wir am meisten.`);
inset(68.4, "insYear", 84.6);
const months = F.full.months, maxPv = Math.max(...months.map(r => r.pv)), T0 = 69.4, MD = 1.15;
// Die Sonne wandert jetzt übers Jahr – ihre Strom-Männchen starten aber an einem festen Punkt. Also solange ausblenden.
tl.to(S.sun, { opacity: 0, duration: .4 }, T0 - .4).to(S.sun, { opacity: 1, duration: .5 }, 85);
months.forEach((r, i) => {
  const t = T0 + i * MD, winter = [0, 1, 10, 11].includes(r.m);
  tl.call(() => { q("#calMonth").textContent = MONL[r.m].slice(0, 3); }, [], t)
    .to(`.ybar[data-i="${i}"]`, { opacity: 1, scaleY: 1, duration: .5, ease: "back.out(2)" }, t)
    .to("#wsunpos", { x: 1650, y: 720 - (r.pv / maxPv) * 480, duration: MD, ease: "sine.inOut" }, t)
    .to("#sky", { fill: winter ? "#c3d3e3" : "#7fc4f3", duration: MD }, t)
    .to("#snow, #snowRoof, #snowGround", { opacity: winter ? 1 : 0, duration: .6 }, t);
});
tl.call(() => { q("#calMonth").textContent = "Jan"; }, [], 0);
say(73, "Im Winter ist die Sonne ganz schön faul …", 4);
tl.to("#snow, #snowRoof, #snowGround", { opacity: 0, duration: .8 }, 83.6);
sunTo(83.6, 1650, 300, 1.4);
sky(83.6, "#86c8f2", 1.4);

// ---- 1:25 Dezember 2025: die Batterie ----
shot(85, 1300, 650, 1.3, 2.6);
cap(85.4, "Dezember 2025", "Neu im Team: eine Batterie. Mittags laden, abends nutzen – so reicht der Sonnenstrom bis in die Nacht.");
tl.to("#battery", { opacity: 1, scale: 1, duration: .6, ease: "back.out(2.5)" }, 87.4);
tl.to(S.grid, { opacity: 0, duration: 1.2 }, 88).to(S.gridBatt, { opacity: 1, duration: 1.2 }, 88);
bang(87.5, "BZZZT!", 760, 560, -10, "#7ff0e4", 60);
// zweimal Tag und Nacht
for (let c = 0; c < 2; c++) {
  const t = 89 + c * 7;
  tl.call(() => snd.mood(false), [], t).call(() => snd.mood(true), [], t + 3.6);
  tl.to(S.battIn, { opacity: 1, duration: .4 }, t).to(S.battOut, { opacity: 0, duration: .4 }, t)
    .to("#bfill", { scaleY: 1, duration: 3, ease: "sine.inOut" }, t)
    .to("#night", { opacity: 0, duration: 1 }, t).to("#stars", { opacity: 0, duration: 1 }, t)
    .to("#wsunpos", { y: 300, duration: 1.2 }, t)
    .to("#sunnyFace .face", { scaleY: 1, transformOrigin: "50% 50%", duration: .3 }, t);
  tl.to(S.battIn, { opacity: 0, duration: .4 }, t + 3.5).to(S.battOut, { opacity: 1, duration: .4 }, t + 3.5)
    .to(S.sun, { opacity: 0, duration: .3 }, t + 2.9).to(S.roof, { opacity: 0, duration: .4 }, t + 3.5).to(S.exp, { opacity: 0, duration: .4 }, t + 3.5)
    .to("#wsunpos", { y: 1250, duration: 1.4, ease: "power2.in" }, t + 3.2)
    .to("#night", { opacity: .6, duration: 1.2 }, t + 3.6).to("#stars", { opacity: 1, duration: 1.2 }, t + 3.8)
    .to("#bfill", { scaleY: .15, duration: 3, ease: "sine.inOut" }, t + 3.8)
    .to("#sunnyFace .face", { scaleY: .5, duration: .3 }, t + 3.8)
    .to(S.sun, { opacity: 1, duration: .4 }, t + 8.4).to(S.roof, { opacity: 1, duration: .4 }, t + 7).to(S.exp, { opacity: 1, duration: .4 }, t + 7);
}
say(90.2, "Mittags hüpfen wir in die Batterie …", 3, { keep: true });
say(93.6, "… und abends helfen wir im Haus!", 3.2, { follow: true });
tl.to("#night, #stars", { opacity: 0, duration: 1 }, 103).to("#wsunpos", { y: 300, duration: 1.4 }, 103)
  .to(S.battOut, { opacity: 0, duration: .4 }, 103).to("#sunnyFace .face", { scaleY: 1, duration: .3 }, 103);
inset(103.6, "insBatt", 111.4);
tl.call(() => snd.mood(false), [], 103);
tl.to("#ringPrev", { attr: { "stroke-dasharray": `${F.autPrev * 100} 100` }, duration: 1.2, ease: "power2.out" }, 104.4)
  .to("#ringCur", { attr: { "stroke-dasharray": `${F.autCur * 100} 100` }, duration: 1.6, ease: "power2.out" }, 105.6);
say(106.2, `Jetzt kommen ${f0.format(F.autCur * 100)} % vom eigenen Dach!`, 4.4);

// ---- 1:52 Was es bringt: ein Wald wächst ----
shot(111.4, 1700, 560, .52, 3.4);
cap(111.8, "Seit 2019", "Verglichen mit dem gleichen Haus mit Gasheizung und ohne Solardach:");
qa("#trees .tree").forEach((t, i) => tl.to(t, { scale: +t.dataset.s!, duration: .5, ease: "back.out(3)" }, 113.4 + i * .09));
qa("#trees .tree").forEach((_, i) => { if (i % 5 === 2) sfx(113.5 + i * .09, "plop"); });
bang(114, "PLOPP!", 1180, 560, -8, "#9be38a", 56);
bang(115.6, "PLOPP!", 1640, 620, 8, "#9be38a", 50);
inset(114.6, "insCount", 125.2);
counter(115.2, "cntEur", F.savedTotal, 2, v => `${f0.format(v)} €`);
counter(116.4, "cntCo2", F.co2Total / 1000, 2, v => `${f1.format(v)} t`);
counter(117.6, "cntPaid", F.paid * 100, 2, v => `${f0.format(v)} %`);
say(119.4, `So viel CO₂ schaffen ${f0.format(F.trees)} Bäume im Jahr!`, 4.6);

// ---- 2:05 Unterm Strich (Vorteile und Mitmach-Aufruf werden unten eingefügt), dann Sonnenuntergang ----
shot(125.2, 1500, 640, .95, 3);
cap(125.6, "Unterm Strich", "Das bringt unser Sonnenhaus – Jahr für Jahr, seit 2019:");
say(127.4, "Das kann sich sehen lassen!", 3.4);
sky(131, "#f59b62", 2.4);
sunTo(131, 1650, 1250, 4, "power1.in");
tl.to(S.sun, { opacity: 0, duration: .5 }, 131);
tl.to(Object.values(S), { opacity: 0, duration: 1 }, 133)
  .call(() => snd.mood(true), [], 133)
  .to("#night", { opacity: .55, duration: 2 }, 133).to("#stars", { opacity: 1, duration: 2 }, 133.6)
  .to("#sunnyPos", { x: 260, duration: .8, ease: "back.in(1.6)" }, 133.6)
  .to("#cap", { opacity: 0, y: -10, duration: .5 }, 133.6);
tl.set("#end", { opacity: 1 }, 134.6).call(() => snd.play("tada"), [], 134.6).fromTo("#end", { scale: .3, transformOrigin: "50% 50%" }, { scale: 1, duration: .8, ease: "back.out(2)" }, 134.6);
if (LOOP) {
  tl.set("#irisCover", { display: "inline" }, 137.6).to("#iris", { attr: { r: 0 }, duration: 1.6, ease: "power2.in" }, 137.6);
  sfx(137.6, "whoosh");
  tl.to({}, { duration: .4 }, 139.2); // kurz schwarz, dann von vorn
} else tl.to({}, { duration: .1 }, 136);

// ---- 1:07 Wetter: Wolken, Gewitter, Regenbogen (alles Spätere rückt dafür nach hinten) ----
const W0 = 66.6, WD = 12.4;
tl.shiftChildren(WD, false, W0);
const sunCloud = stream("pSun", "#ffd43b", FL.sun * .15);   // unter dicken Wolken: nur noch ein Bruchteil
const expCloud = stream("pExp", "#ffd43b", FL.exp * .15);
shot(W0, 1500, 470, .9, 2.6);
cap(W0 + .4, "Und bei Wolken?", "Auch dann macht das Dach Strom – nur viel weniger. Bei dicken Wolken und Gewitter kommt kaum Sonne durch.");
tl.to("#storm", { x: 0, duration: 3, ease: "power2.out" }, W0 + .6)
  .to("#sky", { fill: "#7f8ea3", duration: 2.5 }, W0 + .8)
  .to(S.sun, { opacity: 0, duration: 1.4 }, W0 + 1.6).to(sunCloud, { opacity: 1, duration: 1.4 }, W0 + 1.6)
  .to(S.exp, { opacity: 0, duration: 1.4 }, W0 + 1.8).to(expCloud, { opacity: 1, duration: 1.4 }, W0 + 1.8)
  .to("#rain", { opacity: 1, duration: .8 }, W0 + 2.4)
  .call(() => snd.startLoop("rain"), [], W0 + 2.4);
say(W0 + 3, "Huch! Jetzt kommen nur ganz wenige von uns an.", 3.4);
for (const lt of [W0 + 4.4, W0 + 6.6]) {
  tl.set("#bolt", { opacity: 1 }, lt).set("#bolt", { opacity: 0 }, lt + .35)
    .set("#flash", { opacity: .85 }, lt).to("#flash", { opacity: 0, duration: .5, ease: "power2.out" }, lt + .01);
  sfx(lt + .1, "thunder");
}
bang(W0 + 4.5, "KAWUMM!", 760, 520, -10, "#fff36b", 64);
tl.to("#rain", { opacity: 0, duration: 1 }, W0 + 8.4).call(() => snd.stopLoop("rain", 1.5), [], W0 + 8.4)
  .to("#storm", { x: -2600, duration: 3, ease: "power2.in" }, W0 + 8.4)
  .to("#sky", { fill: "#86c8f2", duration: 2 }, W0 + 9)
  .to(sunCloud, { opacity: 0, duration: 1.2 }, W0 + 9.4).to(S.sun, { opacity: 1, duration: 1.2 }, W0 + 9.4)
  .to(expCloud, { opacity: 0, duration: 1.2 }, W0 + 9.6).to(S.exp, { opacity: 1, duration: 1.2 }, W0 + 9.6)
  .to("#rainbow", { opacity: .85, duration: 1.2 }, W0 + 9.6).to("#rainbow", { opacity: 0, duration: 1 }, W0 + WD - .2);
say(W0 + 9.8, "Und danach: ein Regenbogen!", 2.4);
tl.set([sunCloud, expCloud], { opacity: 0 }, 0);

// Sicherheitsnetz: Die Sonnen-Männchen starten an einem festen Punkt unter der Sonne. Steht die Sonne woanders
// (Auf- und Untergang, Zeitraffer), wären sie Stromis aus dem Nichts – dann bleiben sie ausgeblendet.
const sunPos = q("#wsunpos");
gsap.ticker.add(() => {
  const home = Math.abs(Number(gsap.getProperty(sunPos, "x")) - 1650) < 12 && Math.abs(Number(gsap.getProperty(sunPos, "y")) - 300) < 12;
  for (const g of [S.sun, sunCloud]) if ((g.style.visibility !== "hidden") !== home) g.style.visibility = home ? "" : "hidden";
});

// ---- Abschluss: die größten Vorteile – demnächst ein E-Auto – MACH MIT! (Sonnenuntergang rückt dafür nach hinten) ----
const B0 = 125.2 + WD, C0 = 131 + WD, CD = 27.6, E0 = B0 + 10, M0 = E0 + 10;
tl.shiftChildren(CD, false, C0 - .05);
inset(B0 + 1, "insWins", B0 + 9.6);
counter(B0 + 1.5, "cntW1", F.autCur * 100, 1.6, v => `${f0.format(v)} %`);
counter(B0 + 2.3, "cntW2", F.savedTotal, 1.8, v => `${f0.format(v)} €`);
counter(B0 + 3.1, "cntW3", F.co2Total / 1000, 1.8, v => `${f1.format(v)} t`);
counter(B0 + 3.9, "cntW4", F.paid * 100, 1.8, v => `${f0.format(v)} %`);
bang(B0 + 6, "WOW!", 1080, 560, 8, "#fff36b", 70);
sfx(B0 + 6, "pling");

// Demnächst: das Benzin-Auto fährt weg, ein Elektroauto zieht ein
shot(E0, 1000, 700, 1.05, 2.4);
cap(E0 + .3, "Demnächst", "Unser Auto tankt leider noch Benzin. Aber bald zieht ein Elektroauto ein – dann fährt auch das mit Sonnenstrom!");
tl.to("#oldCar .smoke", { opacity: 1, duration: .3 }, E0 + 1.6)
  .to("#oldCar", { x: -900, duration: 2.6, ease: "power2.in" }, E0 + 1.8);
bang(E0 + 1.8, "TÖFF TÖFF!", 520, 640, -8, "#c8cfd8", 54);
tl.to("#eCar", { x: 700, duration: 2.4, ease: "power3.out" }, E0 + 4.6);
bang(E0 + 4.8, "SUMMM!", 760, 560, 6, "#7fd3ff", 58);
bang(E0 + 7, "BALD!", 600, 720, -12, "#ffd43b", 64);
say(E0 + 6, "Dann tanken wir Sonne statt Benzin!", 3.6);

// MACH MIT!
shot(M0, 1500, 640, .95, 2);
tl.set("#machmit", { opacity: 1 }, M0 + .2)
  .fromTo("#machmit .mi", { scale: .1, rotation: -20 }, { scale: 1, rotation: -4, duration: .7, ease: "back.out(2.2)" }, M0 + .2)
  .to("#machmit .mi", { scale: 1.06, duration: .35, repeat: 3, yoyo: true, ease: "sine.inOut" }, M0 + .9)
  .to("#machmit .mi", { scale: .2, opacity: 0, duration: .4, ease: "back.in(2)" }, M0 + 2.4)
  .set("#machmit", { opacity: 0 }, M0 + 2.8).set("#machmit .mi", { opacity: 1 }, M0 + 2.8);
sfx(M0 + .2, "tada");
cap(M0 + 2.6, "Mach mit!", "Die Sonne schickt keine Rechnung – jedes Dach und jeder Balkon zählt.");
inset(M0 + 2.8, "insCta", M0 + 12.8);
say(M0 + 4.2, "Fang klein an – jedes Stück Dach zählt!", 3.6, { keep: true });
say(M0 + 8.6, "Schreib uns einfach – wir helfen gern!", 3.4, { follow: true });
say(C0 + CD + .2, "Tschüss – bis bald!", 3);

// ---------- Nacht-Dimmung, wach bleiben, Neuladen, Bildschirm-Größe ----------
function clock() {
  const h = new Date().getHours();
  document.body.classList.toggle("night", h >= NIGHT.from || h < NIGHT.to);
}
clock();
setInterval(clock, 60_000);
async function stayAwake() {
  try { await (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<unknown> } }).wakeLock?.request("screen"); } catch { /* nicht überall verfügbar */ }
}
// nur am Außen-Display: Bildschirm wach halten und regelmäßig neu laden
if (LOOP) {
  stayAwake();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") stayAwake(); });
  setTimeout(() => location.reload(), RELOAD_H * 3600_000);
}

// ---------- Bedienung: schwebende Knöpfe (Vollbild, Pause, Musik), Zahlen & Diagramme, Ende ----------
const filmBox = document.getElementById("filmBox")!;
let userPaused = false, autoPaused = false;

const ICON = {
  fs: `<svg viewBox="-24 -24 48 48" class="i-fs"><path d="M-14 -5 V-14 H-5 M5 -14 H14 V-5 M14 5 V14 H5 M-5 14 H-14 V5"/></svg>
       <svg viewBox="-24 -24 48 48" class="i-fsx"><path d="M-14 -5 H-5 V-14 M5 -14 V-5 H14 M14 5 H5 V14 M-5 14 V5 H-14"/></svg>`,
  pause: `<svg viewBox="-24 -24 48 48" class="i-pause"><rect x="-11" y="-13" width="8" height="26" rx="2"/><rect x="3" y="-13" width="8" height="26" rx="2"/></svg>
          <svg viewBox="-24 -24 48 48" class="i-play"><path d="M-8 -14 L14 0 L-8 14Z"/></svg>`,
  music: `<svg viewBox="-24 -24 48 48" class="i-music"><path d="M-7 12 V-14 L13 -19 V6" class="ln"/><circle cx="-12" cy="12" r="6"/><circle cx="8" cy="6" r="6"/>
          <path d="M-20 -20 L20 20" class="slash"/></svg>`,
};
const ctrl = document.createElement("div");
ctrl.id = "ctrl";
ctrl.innerHTML = `<button id="cFs" type="button" aria-label="Vollbild" title="Vollbild (F)">${ICON.fs}</button>
  <button id="cPause" type="button" aria-label="Film anhalten" title="Film anhalten (Leertaste)">${ICON.pause}</button>
  <button id="cMusic" type="button" aria-label="Musik ausschalten" aria-pressed="true" title="Musik an/aus">${ICON.music}</button>`;
// Der Rahmen hat genau das 16:9-Bild – so sitzen die Knöpfe im Bild und nicht in schwarzen Rändern
const frame = document.getElementById("filmFrame")!;
frame.appendChild(ctrl);
if (LOOP) ctrl.style.display = "none";
const $c = (id: string) => document.getElementById(id)!;
function fitFrame() {
  const w = Math.min(filmBox.clientWidth, filmBox.clientHeight * 16 / 9);
  Object.assign(frame.style, { width: `${w}px`, height: `${w * 9 / 16}px` });
  frame.style.setProperty("--u", `${w / 100}px`);   // 1 % der Filmbreite, für die Knopfgröße
}
new ResizeObserver(fitFrame).observe(filmBox);
fitFrame();

// Wie bei einem Videoplayer: Knöpfe bei Bewegung oder Tipp einblenden, nach 2,5 s ohne Bedienung ausblenden.
// Stehen bleiben sie, solange der Film pausiert, wartet oder zu Ende ist.
let idleTimer = 0;
const pinned = () => gateOpen || gsap.globalTimeline.paused() || tl.progress() === 1;
function wake() {
  filmBox.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => { if (!pinned()) filmBox.classList.add("idle"); }, 2500);
}
for (const ev of ["pointermove", "pointerdown", "focusin"]) filmBox.addEventListener(ev, wake, { passive: true });

/** Hält den Film an (Zeitleiste, Strom-Männchen, Geräusche) – die Musik läuft weiter. */
function setPaused(p: boolean) {
  gsap.globalTimeline.paused(p);
  wake();
  snd.setFx(!p);
  $c("cPause").classList.toggle("paused", p);
  $c("cPause").setAttribute("aria-label", p ? "Film weiterspielen" : "Film anhalten");
}
function togglePause() {
  if (gateOpen) { closeGate(); return; }
  userPaused = !gsap.globalTimeline.paused(); autoPaused = false; setPaused(userPaused);
}
$c("cPause").addEventListener("click", togglePause);

// Musik an/aus – beim Laden immer an
let musicOn = true;
function setMusic(on: boolean) {
  musicOn = on;
  snd.setMusic(on);
  $c("cMusic").classList.toggle("off", !on);
  $c("cMusic").setAttribute("aria-pressed", String(on));
  $c("cMusic").setAttribute("aria-label", on ? "Musik ausschalten" : "Musik einschalten");
}
setMusic(true);
// Wartet die Musik noch auf den ersten Tipp, schaltet dieser Tipp sie ein (nicht gleich wieder aus)
$c("cMusic").addEventListener("click", () => { if ($c("cMusic").classList.contains("wait")) { $c("cMusic").classList.remove("wait"); setMusic(true); } else setMusic(!musicOn); });

// Vollbild: echtes Vollbild, wo es geht – auf dem iPhone ein „Fast-Vollbild“ (Film füllt den Bildschirm)
type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
const fsDoc = document as FsDoc, root = document.documentElement;
const realFs = !!(document.fullscreenEnabled || fsDoc.webkitFullscreenEnabled);
const isFs = () => !!(fsDoc.fullscreenElement ?? fsDoc.webkitFullscreenElement) || root.classList.contains("fakefs");
// Handy: beim Vollbild gleich ins Querformat drehen (Android); ohne Dreh-Sperre dreht CSS den Film (html.rot)
type Orient = ScreenOrientation & { lock?: (o: string) => Promise<void> };
const portrait = () => matchMedia("(orientation: portrait)").matches;
const toLandscape = () => (screen.orientation as Orient | undefined)?.lock?.("landscape").catch(() => { if (portrait()) root.classList.add("rot"); });
function toggleFullscreen() {
  if (realFs) {
    if (fsDoc.fullscreenElement ?? fsDoc.webkitFullscreenElement) (fsDoc.exitFullscreen ? fsDoc.exitFullscreen() : fsDoc.webkitExitFullscreen?.());
    else {
      const el = filmBox as FsEl;
      const done = el.requestFullscreen ? el.requestFullscreen({ navigationUI: "hide" }) : (el.webkitRequestFullscreen?.(), undefined);
      if (matchMedia("(pointer: coarse)").matches) Promise.resolve(done).then(toLandscape).catch(() => {});
    }
  } else {
    root.classList.toggle("fakefs");
    if (isFs()) { filmBox.scrollIntoView(); appTip(); }
    syncFs();
  }
}
// iPhone-Safari kann für Seiten kein echtes Vollbild. Als App vom Home-Bildschirm aber schon – das verraten wir einmal.
let tipShown = false;
function appTip() {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  if (standalone !== false) return;   // nur iPhone/iPad-Safari im Browser
  if (tipShown) return;   // einmal pro Seitenaufruf – bewusst ohne Speicher im Browser (keine Einwilligung nötig)
  tipShown = true;
  const tip = document.createElement("div");
  tip.id = "appTip"; tip.setAttribute("role", "status");
  tip.innerHTML = `<b>Tipp:</b> Über <b>Teilen → Zum Home-Bildschirm</b> wird der Film zur App – dann läuft er ganz ohne Safari-Leisten.`;
  frame.appendChild(tip);
  window.setTimeout(() => tip.remove(), 7000);
  tip.addEventListener("click", () => tip.remove());
}
function syncFs() {
  if (!isFs()) { root.classList.remove("rot"); (screen.orientation as Orient | undefined)?.unlock?.(); }
  $c("cFs").classList.toggle("on", isFs()); $c("cFs").setAttribute("aria-label", isFs() ? "Vollbild beenden" : "Vollbild");
}
document.addEventListener("fullscreenchange", syncFs);
document.addEventListener("webkitfullscreenchange", syncFs);
$c("cFs").addEventListener("click", toggleFullscreen);

const press = (sel: string, fn: () => void) => {
  q(sel).addEventListener("click", fn);
  q(sel).addEventListener("keydown", e => { const k = (e as KeyboardEvent).key; if (k === "Enter" || k === " ") { e.preventDefault(); fn(); } });
};
press("#startBtn", () => { closeGate(); });
gsap.to("#startBtn .sb", { scale: 1.05, transformOrigin: "50% 50%", duration: .6, repeat: -1, yoyo: true, ease: "sine.inOut" });
// „Zahlen & Diagramme“: auf der Startseite direkt darunter, sonst dorthin wechseln
const toRead = () => {
  if (root.classList.contains("fakefs")) toggleFullscreen();
  const target = document.getElementById("top");
  if (target) target.scrollIntoView({ behavior: "smooth" }); else location.href = "index.html#top";
};
press("#readBtn", toRead);
press("#endReadBtn", toRead);
press("#againBtn", () => { showEndButtons(false); if (gsap.globalTimeline.paused()) setPaused(false); tl.restart(); });
// autoAlpha blendet aus und setzt danach visibility: hidden – so fangen unsichtbare Knöpfe keine Klicks
function showEndButtons(on: boolean) {
  if (on) wake();
  gsap.to("#endBtns", { autoAlpha: on ? 1 : 0, duration: .4 });
  q("#endBtns").style.pointerEvents = on ? "auto" : "none";
  gsap.to("#readBtn", { autoAlpha: on || LOOP ? 0 : 1, duration: .3 });
}
gsap.to("#readBtn .rb", { y: 6, duration: .7, repeat: -1, yoyo: true, ease: "sine.inOut" });
if (LOOP) q("#readBtn").style.display = "none";
if (LOOP) q("#endSub").textContent = "Gleich geht's wieder los!";

// Wird der Film aus dem Bild gescrollt, pausiert er (die Musik spielt weiter) – und läuft weiter, wenn man zurückkommt
new IntersectionObserver(([e]) => {
  if (e.intersectionRatio < .4 && !gsap.globalTimeline.paused()) { autoPaused = true; setPaused(true); }
  else if (e.intersectionRatio >= .4 && autoPaused && !userPaused && !gateOpen) { autoPaused = false; setPaused(false); }
}, { threshold: [0, .4, 1] }).observe(filmBox);
// Ist der Film oben aus dem Bild, bleibt nur noch der Musik-Knopf oben rechts; Pause und Vollbild bleiben beim Film
const syncAway = () => {
  const away = filmBox.getBoundingClientRect().bottom < 80;
  if (away !== root.classList.contains("filmaway")) root.classList.toggle("filmaway", away);
};
addEventListener("scroll", syncAway, { passive: true });
addEventListener("resize", syncAway);
syncAway();

// Tasten: Leertaste pausiert (nur solange der Film zu sehen ist), Pfeiltasten springen ±10 s, F = Vollbild
document.addEventListener("keydown", e => {
  const inView = filmBox.getBoundingClientRect().bottom > innerHeight * .5;
  if (!inView || (e.target as HTMLElement).closest?.("input, select, textarea")) return;
  wake();
  if (e.key === "ArrowRight") tl.time(tl.time() + 10);
  if (e.key === "ArrowLeft") tl.time(Math.max(0, tl.time() - 10));
  if (e.key === " " && !(e.target as HTMLElement).closest?.(".btn, button")) { e.preventDefault(); togglePause(); }
  if (e.key === "f") toggleFullscreen();
});

(window as unknown as { tl: typeof tl; snd: Sound }).tl = tl;
(window as unknown as { snd: Sound }).snd = snd;

// ---- Katzen-Geschichten (Zeiten nach allen Einschüben) ----
// Hinweis: cat2 ist gespiegelt gezeichnet – dort zeigt +x nach links.
gsap.to(".zz", { y: -26, opacity: 0, duration: 1.8, repeat: -1, stagger: .5, ease: "sine.out" });
const POSES = ["csit", "clie", "cside", "carch", "cbow"];
tl.set("#cat1, #cat2, #cat3", { x: 0, y: 0, opacity: 1 }, 0)
  .set(".cat .csit", { opacity: 1, scaleX: 1, scaleY: 1 }, 0).set(".cat .clie, .cat .cside, .cat .carch, .cat .cbow", { opacity: 0 }, 0)
  .set(".cat .ceyes", { opacity: 1 }, 0).set(".cat .csleep, .cat .cyawn", { opacity: 0 }, 0).set(".zzz", { opacity: 0 }, 0);
/** Haltung wechseln (kurzes Überblenden). */
function pose(t: number, p: string, ...ids: string[]) {
  for (const id of ids) tl.to(POSES.filter(x => x !== p).map(x => `${id} .${x}`).join(","), { opacity: 0, duration: .2 }, t)
    .to(`${id} .${p}`, { opacity: 1, duration: .2 }, t);
}
const lie = (t: number, ...ids: string[]) => pose(t, "clie", ...ids);
const sit = (t: number, ...ids: string[]) => pose(t, "csit", ...ids);
const zzz = (t0: number, t1: number, ...ids: string[]) => tl.to(ids.join(","), { opacity: 1, duration: .5 }, t0).to(ids.join(","), { opacity: 0, duration: .4 }, t1);
const hop = (t: number, id: string, h = 40) => tl.to(id, { keyframes: [{ y: -h, duration: .18, ease: "power2.out" }, { y: 0, duration: .26, ease: "bounce.out" }] }, t);
function yawn(t: number, id: string) {
  tl.to(`${id} .csit .ceyes`, { opacity: 0, duration: .1 }, t).to(`${id} .csit .csleep`, { opacity: 1, duration: .1 }, t)
    .to(`${id} .cyawn`, { opacity: 1, duration: .15 }, t + .1).to(`${id} .chead`, { rotation: -8, transformOrigin: "50% 100%", duration: .4, yoyo: true, repeat: 1 }, t)
    .to(`${id} .cyawn`, { opacity: 0, duration: .15 }, t + 1).to(`${id} .csit .csleep`, { opacity: 0, duration: .1 }, t + 1.1).to(`${id} .csit .ceyes`, { opacity: 1, duration: .1 }, t + 1.1);
}
/** Vorwärtsstrecken: Vorderpfoten weit nach vorn, Po in die Luft – und genüsslich hin und her. */
function stretch(t: number, id: string, hold = 1.6) {
  pose(t, "cbow", id);
  tl.fromTo(`${id} .cbow`, { scaleX: .94 }, { scaleX: 1.06, svgOrigin: "0 0", duration: hold / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, t);
  pose(t + hold, "csit", id);
}
/** Katzenbuckel: Rücken ganz rund machen und wieder lockerlassen. */
function arch(t: number, id: string, hold = 1.6) {
  pose(t, "carch", id);
  tl.fromTo(`${id} .carch`, { scaleY: .9 }, { scaleY: 1.06, svgOrigin: "0 0", duration: hold / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, t);
  pose(t + hold, "csit", id);
}
/** Katzenyoga: erst Buckel, dann Vorwärtsstrecken. */
function yoga(t: number, id: string, hold = 1.6) {
  pose(t, "carch", id);
  tl.fromTo(`${id} .carch`, { scaleY: .9 }, { scaleY: 1.06, svgOrigin: "0 0", duration: hold / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, t);
  stretch(t + hold, id, hold);
}
/** Laufen auf vier Pfoten zum Ziel-x (Katzen-Koordinaten): Seitenansicht, Beine schwingen im Wechsel. */
const catX: Record<string, number> = {};
function walk(t: number, id: string, x: number, dur: number) {
  const from = catX[id] ?? 0, n = Math.max(2, Math.round(dur / .2));
  catX[id] = x;
  tl.set(`${id} .cside`, { scaleX: x > from ? -1 : 1, svgOrigin: "0 0" }, t);
  pose(t, "cside", id);
  const swing = (sel: string, a: number) => tl.fromTo(sel, { rotation: a }, { rotation: -a, transformOrigin: "50% 0%", duration: .2, repeat: n - 1, yoyo: true, ease: "sine.inOut" }, t + .1)
    .set(sel, { rotation: 0 }, t + .1 + n * .2);
  tl.to(id, { x, duration: dur, ease: "sine.inOut" }, t + .1);
  swing(`${id} .lf1, ${id} .lb2`, 24); swing(`${id} .lf2, ${id} .lb1`, -24);
  tl.fromTo(`${id} .cbody`, { y: 0 }, { y: -3, duration: .2, repeat: n - 1, yoyo: true, ease: "sine.inOut" }, t + .1);
  pose(t + .1 + dur, "csit", id);
}
/** Sprung im Bogen zu (x, y) in Katzen-Koordinaten (y nach oben negativ). */
const catY: Record<string, number> = {};
function jump(t: number, id: string, x: number, y: number, h = 70) {
  const x0 = catX[id] ?? 0, y0 = catY[id] ?? 0;
  catX[id] = x; catY[id] = y;
  tl.to(id, { keyframes: [{ x: (x0 + x) / 2, y: Math.min(y0, y) - h, duration: .3, ease: "power2.out" }, { x, y, duration: .35, ease: "power2.in" }] }, t);
}

// Früher: Vorstellung – die Getigerte gähnt, die Schwarz-Weiße streckt sich
yawn(13.4, "#cat3"); stretch(15.2, "#cat2", 1.4);
// Module fallen aufs Dach: alle erschrecken, die Schwarze macht einen Buckel
hop(20.25, "#cat2"); hop(20.3, "#cat3", 34); hop(21.45, "#cat3", 30); arch(20.4, "#cat1", 1.4);
// Mittags: die Schwarz-Weiße legt sich in die Sonne, die Getigerte macht Katzenyoga und gähnt
walk(25.6, "#cat2", -110, 2.2); lie(28, "#cat2"); zzz(28.6, 37.6, "#zzz2");
yoga(31.6, "#cat3", 1.7); yawn(36.4, "#cat3");
sit(38, "#cat2"); walk(38.6, "#cat2", 0, 2);
// Klimaanlage: die Schwarze springt ins Fenster unter die warme Luft und döst –
// und die Schwarz-Weiße nimmt die Klimaanlage als Treppe: hopp aufs Gerät, hopp aufs Dach, Sonnenbad bei den Modulen
jump(45.4, "#cat1", 280, 0); lie(46.4, "#cat1"); zzz(46.8, 53.4, "#zzz1b"); sit(53.4, "#cat1"); jump(54, "#cat1", 0, 0);
jump(48.4, "#cat2", -220, -130, 60); sfx(48.7, "plop");
jump(50.2, "#cat2", -145, -345, 90); bang(50.5, "HOPP!", 960, 360, -8, "#c8f08a", 48);
lie(51.2, "#cat2");
sit(57.4, "#cat2"); jump(58, "#cat2", -220, -130, 30); jump(59.2, "#cat2", 0, 0, 40); sfx(59.8, "plop");
// Das E-Bike kommt: die Getigerte läuft hinterher und schnuppert
walk(57.2, "#cat3", -160, 1.4); yawn(60.2, "#cat3"); walk(63, "#cat3", 0, 1.5);
// Gewitter: beim ersten Donner flitzen alle ins Haus, nach dem Regenbogen kommen sie wieder raus
const T1 = 66.6 + 4.4;
tl.to("#cat3", { x: 190, duration: .6, ease: "power2.in" }, T1 + .2).to("#cat3", { opacity: 0, duration: .2 }, T1 + .8)
  .to("#cat2", { x: 100, duration: .45, ease: "power2.in" }, T1 + .3).to("#cat2", { opacity: 0, duration: .2 }, T1 + .75)
  .to("#cat1", { opacity: 0, duration: .3 }, T1 + .4);
bang(T1 + .9, "MIAU!", 1020, 640, -10, "#ffc2d4", 44);
tl.set("#cat3, #cat2", { x: 0 }, 66.6 + 10).to("#cat1, #cat2, #cat3", { opacity: 1, duration: .6, stagger: .3 }, 66.6 + 10);
// Zeitraffer: die Schwarze klettert aufs Dach und sonnt sich – bis der Winter kommt
yawn(84, "#cat2"); lie(86, "#cat3"); sit(92, "#cat3");
// Batterie-Nächte: alle legen sich schlafen
for (const n of [105, 112]) { lie(n + .3, "#cat1", "#cat2", "#cat3"); zzz(n + .6, n + 3.2, "#zzz1", "#zzz2", "#zzz3"); sit(n + 3.3, "#cat1", "#cat2", "#cat3"); }
// … und morgens wird sich erst mal gestreckt
stretch(108.7, "#cat2", 1.3); arch(115.9, "#cat3", 1.3);
// Der Wald wächst: Spaziergang und Nickerchen im Gras
yawn(126, "#cat2"); walk(128, "#cat3", 130, 2); lie(130.4, "#cat3"); sit(136, "#cat3"); walk(136.4, "#cat3", 0, 1.6);
// Das E-Auto kommt: die Katzen staunen
yawn(E0 + 2, "#cat1"); hop(E0 + 6.6, "#cat3", 34); sfx(E0 + 6.6, "meow"); hop(E0 + 6.8, "#cat2", 26);
// Mach mit: die Getigerte macht Werbung
// Mach mit: Katzenyoga für alle!
yoga(M0 + 1.6, "#cat2", 1.6); yoga(M0 + 2, "#cat3", 1.6);
hop(M0 + 9.2, "#cat3", 30); sfx(M0 + 9.2, "meow");
// Sonnenuntergang: alle schlafen ein
lie(C0 + CD + 1.4, "#cat1", "#cat2", "#cat3");
tl.to("#zzz1, #zzz2, #zzz3", { opacity: 1, duration: .5 }, C0 + CD + 1.8);   // bleibt bis zum Ende


// Am Außen-Display startet der Film von selbst, sonst mit dem Start-Knopf (dann ist auch der Ton sicher an)
if (LOOP) {
  startSound();   // Kiosk-Chromium erlaubt Ton ohne Klick; sonst wartet der Film auf den Start-Knopf
  window.setTimeout(() => { if (!soundReady && !quiet()) { tl.seek(2.6, true); openGate(); } }, 400);
} else {
  tl.seek(2.6, true); openGate();
  // Musik gleich beim Öffnen – klappt, wo der Browser es erlaubt; sonst beim ersten Tipp (der Musik-Knopf wackelt so lange)
  startSound();
  window.setTimeout(() => { if (!soundReady) $c("cMusic").classList.add("wait"); }, 400);
}
