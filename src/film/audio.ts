// Musik und Geräusche, komplett im Browser erzeugt (Web Audio) – keine Audiodateien, keine Lizenzfragen.
// Musik: eigener Soundtrack im Super-Nintendo-Stil (soundtrack.ts).
// Geräusche: passend zu den Lautmalereien im Film, dazu Vögel am Tag und Grillen in der Nacht.
import { Soundtrack } from "./soundtrack";

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export type Sfx = "klonk" | "pling" | "whoosh" | "zip" | "honk" | "buzz" | "plop" | "meow" | "blip" | "tada" | "tick" | "thunder";
export type Loop = "fan" | "rain";

export class Sound {
  ctx: AudioContext;
  private master: GainNode;
  private music: GainNode;
  private musicFilter: BiquadFilterNode;
  private fx: GainNode;
  private noise: AudioBuffer;
  private track: Soundtrack;
  night = false;            // Abendstimmung: Musik leiser und weicher, Grillen statt Vögel
  private musicOn = true;
  private started = false;

  constructor(volume = .8) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.gain(volume, this.ctx.destination);
    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = "lowpass";
    this.musicFilter.frequency.value = 9000;
    this.musicFilter.connect(this.master);
    this.music = this.gain(.16, this.musicFilter);
    this.fx = this.gain(.5, this.master);
    // Rauschen für Schlagzeug, Geräusche, Lüfter und Regen
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate);   // 3 s, damit Schleifen nicht „pumpen“
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.track = new Soundtrack(this.ctx, this.music, this.noise);
  }

  get running() { return this.ctx.state === "running"; }

  private silentEl?: HTMLAudioElement;
  /**
   * Muss direkt in einem Klick/Tipp aufgerufen werden. Gibt den Ton frei – auch auf dem iPhone,
   * wenn der Stummschalter auf „lautlos“ steht: Ein (stummes) HTML-Audio stellt iOS auf „Wiedergabe“ um.
   */
  unlock() {
    try { const s = (navigator as Navigator & { audioSession?: { type: string } }).audioSession; if (s) s.type = "playback"; } catch { /* älteres iOS */ }
    if (!this.silentEl) {
      this.silentEl = new Audio(silentWavUrl());
      this.silentEl.loop = true;
      this.silentEl.setAttribute("playsinline", "");
    }
    this.silentEl.play().catch(() => { /* nicht schlimm */ });
    const b = this.ctx.createBuffer(1, 1, 22050), src = this.ctx.createBufferSource();
    src.buffer = b; src.connect(this.ctx.destination); src.start(0);
    return this.ctx.resume();
  }

  /** Geräusche an/aus (z. B. während der Film pausiert ist); die Musik läuft davon unabhängig. */
  setFx(on: boolean) { this.fx.gain.setTargetAtTime(on ? .5 : 0, this.ctx.currentTime, .1); this.fxOn = on; }
  private fxOn = true;

  /** Musik an/aus (Geräusche bleiben). */
  setMusic(on: boolean) {
    this.musicOn = on;
    this.applyMusicLevel();
  }

  private level() { return this.night ? .6 : .9; }
  private applyMusicLevel() { this.music.gain.setTargetAtTime(this.musicOn ? this.level() : 0, this.ctx.currentTime, .25); }

  async resume() { try { await this.ctx.resume(); } catch { /* ohne Nutzer-Geste nicht erlaubt */ } return this.running; }

  /** Lautstärke 0–1 (0 = stumm, z. B. nachts wegen der Nachbarn). */
  setVolume(v: number) { this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .3); }

  /** Abendstimmung an/aus. */
  mood(night: boolean) {
    this.night = night;
    this.track.night = night;
    const t = this.ctx.currentTime;
    this.musicFilter.frequency.setTargetAtTime(night ? 1600 : 16000, t, .6);
    this.applyMusicLevel();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.track.start();
    this.applyMusicLevel();
    window.setInterval(() => this.ambience(), 1800);
  }

  // ---------- Bausteine ----------
  private gain(v: number, to: AudioNode) { const g = this.ctx.createGain(); g.gain.value = v; g.connect(to); return g; }

  private tone(type: OscillatorType, f: number, t: number, dur: number, vol: number, out: AudioNode, opts: { to?: number; attack?: number; detune?: number } = {}) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (opts.detune) o.detune.value = opts.detune;
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + (opts.attack ?? .005));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + .05);
  }

  private hiss(t: number, dur: number, vol: number, out: AudioNode, filter: BiquadFilterType, f: number, fTo?: number, q = 1) {
    const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noise;
    fl.type = filter; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (fTo) fl.frequency.exponentialRampToValueAtTime(fTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, Math.random() * .5); s.stop(t + dur + .05);
  }

  // ---------- Umgebung ----------
  private ambience() {
    if (!this.fxOn) return;
    const t = this.ctx.currentTime + Math.random() * .8;
    if (this.night) {
      // Grillen: schnelle hohe Pulse
      for (let i = 0; i < 5; i++) this.tone("sine", 4200, t + i * .07, .05, .05, this.fx);
    } else if (Math.random() < .55) {
      // Vogel: zwei, drei schnelle Pfiffe
      const base = 2200 + Math.random() * 900;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++)
        this.tone("sine", base, t + i * .13, .1, .06, this.fx, { to: base * 1.5 });
    }
  }

  // ---------- Dauergeräusche: Lüfter der Klimaanlage, Regen ----------
  private loops: Partial<Record<Loop, { src: AudioBufferSourceNode; g: GainNode }>> = {};

  startLoop(name: Loop) {
    if (this.loops[name]) return;
    const t = this.ctx.currentTime, src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = this.noise; src.loop = true;
    const f1 = this.ctx.createBiquadFilter(), f2 = this.ctx.createBiquadFilter();
    if (name === "fan") {
      // tiefes, gleichmäßiges Rauschen, das leicht „atmet“
      f1.type = "bandpass"; f1.frequency.value = 520; f1.Q.value = .7;
      f2.type = "lowpass"; f2.frequency.value = 1400;
      const lfo = this.ctx.createOscillator(), depth = this.ctx.createGain();
      lfo.frequency.value = .6; depth.gain.value = 140;
      lfo.connect(depth); depth.connect(f1.frequency); lfo.start(); lfo.stop(t + 60);
    } else {
      // Regen: helles Prasseln
      f1.type = "highpass"; f1.frequency.value = 1100;
      f2.type = "lowpass"; f2.frequency.value = 7000;
    }
    src.connect(f1); f1.connect(f2); f2.connect(g); g.connect(this.fx);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(name === "fan" ? .5 : .32, t + 1.2);
    src.start(t, Math.random() * .5);
    this.loops[name] = { src, g };
  }

  stopLoop(name: Loop, fade = 1.2) {
    const l = this.loops[name];
    if (!l) return;
    const t = this.ctx.currentTime;
    l.g.gain.cancelScheduledValues(t);
    l.g.gain.setValueAtTime(l.g.gain.value, t);
    l.g.gain.linearRampToValueAtTime(0, t + fade);
    l.src.stop(t + fade + .1);
    delete this.loops[name];
  }

  // ---------- Geräusche ----------
  play(name: Sfx) {
    if (!this.running) return;
    const t = this.ctx.currentTime + .01, o = this.fx;
    switch (name) {
      case "klonk":
        this.tone("square", 180, t, .25, .5, o, { to: 120 }); this.tone("square", 467, t, .18, .25, o);
        this.hiss(t, .08, .7, o, "bandpass", 2500); break;
      case "pling":
        this.tone("sine", 1760, t, .9, .4, o); this.tone("sine", 2637, t, .6, .2, o); break;
      case "whoosh":
        this.hiss(t, .7, .7, o, "bandpass", 300, 3000, 1.5); break;
      case "zip":
        this.hiss(t, .5, .5, o, "highpass", 2000, 6000); this.tone("sawtooth", 300, t, .45, .12, o, { to: 900 }); break;
      case "honk":
        this.tone("square", 311, t, .2, .35, o); this.tone("square", 233, t + .2, .35, .35, o); break;
      case "buzz":
        for (let i = 0; i < 6; i++) this.tone("sawtooth", 110 + (i % 2) * 8, t + i * .09, .08, .3, o); break;
      case "plop":
        this.tone("sine", 700, t, .16, .55, o, { to: 160 }); break;
      case "meow":
        this.tone("sawtooth", 520, t, .55, .18, o, { to: 380, attack: .08 }); this.tone("sine", 780, t + .02, .5, .15, o, { to: 560, attack: .08 }); break;
      case "blip":
        this.tone("sine", 660, t, .09, .25, o, { to: 990 }); break;
      case "tada":
        [60, 64, 67, 72].forEach((n, i) => this.tone("square", midi(n + 12), t + i * .09, .5, .2, o)); break;
      case "tick":
        this.tone("square", 1500, t, .03, .1, o); break;
      case "thunder":
        // Knall, dann langes Grollen
        this.hiss(t, .25, 1, o, "bandpass", 1600, 400, .7);
        this.hiss(t + .05, 2.8, 1.2, o, "lowpass", 260, 60, .5);
        this.tone("sine", 55, t + .05, 2.2, .6, o, { to: 32 }); break;
    }
  }
}

/** Eine halbe Sekunde Stille als WAV – nur zum Freischalten des Tons auf iOS. */
function silentWavUrl() {
  const rate = 8000, n = rate / 2, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, "data"); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}
