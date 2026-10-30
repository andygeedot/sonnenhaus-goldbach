// „Sonnenhaus-Thema“ – ein eigener Soundtrack im Stil der Super-Nintendo-Klassiker, komplett im Browser erzeugt.
// Bewusst neu komponiert (keine geschützten Melodien), aber mit dem typischen 16-Bit-Klang:
// Puls-Lead mit Vibrato, Arpeggios, Streicherfläche, Slap-Bass, Shuffle-Schlagzeug und das berühmte SNES-Echo.
// Form: Thema A – Bridge B – Thema A einen Ganzton höher – Bridge B höher (≈ 2 Minuten, dann von vorn).

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const BPM = 128, BEAT = 60 / BPM, BAR = 4 * BEAT, SWING = .62;   // zweite Achtel etwas später: Shuffle

// Akkorde: Grundton für den Bass und Lage für die Streicher
const CH: Record<string, { root: number; pad: number[] }> = {
  F: { root: 41, pad: [57, 60, 65] }, Dm: { root: 38, pad: [57, 62, 65] }, Bb: { root: 46, pad: [58, 62, 65] },
  C: { root: 36, pad: [55, 60, 64] }, Am: { root: 45, pad: [57, 60, 64] }, Gm: { root: 43, pad: [55, 58, 62] },
  C7: { root: 36, pad: [55, 58, 64] },
};

// Je Takt: Akkord(e) für die beiden Takthälften und acht Achtel Melodie (MIDI; 0 = Ton klingt weiter, -1 = Pause)
interface Bar { ch: [string, string]; mel: number[] }
const A: Bar[] = [
  { ch: ["F", "F"], mel: [72, -1, 69, 72, 77, 0, 76, 74] },
  { ch: ["Dm", "Dm"], mel: [74, 0, 72, 69, 74, 0, 0, -1] },
  { ch: ["Bb", "Bb"], mel: [70, 72, 74, 77, 76, 74, 72, 70] },
  { ch: ["C", "C"], mel: [72, 0, 0, -1, 67, 69, 70, 72] },
  { ch: ["F", "F"], mel: [72, -1, 69, 72, 77, 0, 79, 81] },
  { ch: ["Am", "Am"], mel: [79, 0, 77, 76, 72, 0, 0, -1] },
  { ch: ["Bb", "C"], mel: [74, 0, 77, 0, 76, 0, 72, 0] },
  { ch: ["F", "F"], mel: [77, 0, 0, 0, 0, 0, -1, -1] },
];
const B: Bar[] = [
  { ch: ["Bb", "Bb"], mel: [74, 0, 0, 72, 70, 0, 69, 0] },
  { ch: ["C", "C"], mel: [72, 0, 0, 0, 76, 0, 79, 0] },
  { ch: ["Am", "Am"], mel: [76, 0, 0, 74, 72, 0, 69, 0] },
  { ch: ["Dm", "Dm"], mel: [74, 0, 0, 0, 0, 0, -1, -1] },
  { ch: ["Gm", "Gm"], mel: [70, 0, 74, 0, 77, 0, 74, 0] },
  { ch: ["C", "C"], mel: [76, 0, 72, 0, 79, 0, 76, 0] },
  { ch: ["F", "F"], mel: [77, 0, 76, 0, 77, 0, 81, 0] },
  { ch: ["C7", "C7"], mel: [79, 0, 77, 0, 76, 0, 72, 70] },
];
const SONG: { bars: Bar[]; tr: number }[] = [{ bars: A, tr: 0 }, { bars: B, tr: 0 }, { bars: A, tr: 2 }, { bars: B, tr: 2 }];
const TOTAL = SONG.reduce((a, s) => a + s.bars.length, 0);

export class Soundtrack {
  private bus: GainNode;
  private pulse25: PeriodicWave;
  private pulse12: PeriodicWave;
  private bar = 0;
  private nextBar = 0;
  private timer = 0;
  night = false;

  constructor(private ctx: AudioContext, out: AudioNode, private noise: AudioBuffer) {
    // „SNES-Sound“: etwas Höhen weg (das Original lief mit 32 kHz) und das typische Echo mit gedämpfter Rückkopplung
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass"; tone.frequency.value = 11000;
    tone.connect(out);
    this.bus = ctx.createGain();
    this.bus.connect(tone);
    const delay = ctx.createDelay(1), fb = ctx.createGain(), damp = ctx.createBiquadFilter(), wet = ctx.createGain();
    delay.delayTime.value = BEAT * .75;
    fb.gain.value = .32; damp.type = "lowpass"; damp.frequency.value = 2600; wet.gain.value = .3;
    this.bus.connect(delay); delay.connect(damp); damp.connect(fb); fb.connect(delay); damp.connect(wet); wet.connect(tone);
    this.pulse25 = this.pulseWave(.25);
    this.pulse12 = this.pulseWave(.125);
  }

  start() {
    if (this.timer) return;
    this.nextBar = this.ctx.currentTime + .15;
    this.timer = window.setInterval(() => {
      while (this.nextBar < this.ctx.currentTime + .3) {
        this.playBar(this.bar, this.nextBar);
        this.nextBar += BAR;
        this.bar = (this.bar + 1) % TOTAL;
      }
    }, 25);
  }

  // ---------- Klangerzeuger ----------
  private pulseWave(duty: number) {
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return this.ctx.createPeriodicWave(re, im);
  }

  private env(g: GainNode, t: number, vol: number, a: number, dur: number, rel: number, sustain = .75) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.linearRampToValueAtTime(vol * sustain, t + a + .08);
    g.gain.setValueAtTime(vol * sustain, t + Math.max(a + .08, dur));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur + rel);
  }

  private pan(p: number) { const s = this.ctx.createStereoPanner(); s.pan.value = p; s.connect(this.bus); return s; }

  /** Melodie: Puls 25 % mit verzögertem Vibrato – der klassische 16-Bit-Lead. */
  private lead(n: number, t: number, dur: number) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    if (this.night) o.type = "triangle"; else o.setPeriodicWave(this.pulse25);
    o.frequency.value = midi(n);
    const lfo = this.ctx.createOscillator(), depth = this.ctx.createGain();
    lfo.frequency.value = 5.6;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(dur > BEAT * .6 ? 14 : 4, t + Math.min(dur, .35));
    lfo.connect(depth); depth.connect(o.detune);
    this.env(g, t, this.night ? .2 : .17, .012, dur * .92, .09);
    o.connect(g); g.connect(this.pan(.08));
    o.start(t); lfo.start(t); o.stop(t + dur + .15); lfo.stop(t + dur + .15);
  }

  /** Arpeggio: dünner Puls 12,5 %, sehr kurz. */
  private arp(n: number, t: number) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.setPeriodicWave(this.pulse12); o.frequency.value = midi(n);
    this.env(g, t, .05, .004, .05, .06, .6);
    o.connect(g); g.connect(this.pan(.45));
    o.start(t); o.stop(t + .15);
  }

  /** Streicherfläche: zwei leicht verstimmte Sägezähne, weich gefiltert. */
  private pad(notes: number[], t: number, dur: number) {
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = this.night ? 900 : 1700; f.connect(this.pan(-.35));
    for (const n of notes) for (const det of [-9, 9]) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = midi(n); o.detune.value = det;
      this.env(g, t, .022, .18, dur - .1, .35, 1);
      o.connect(g); g.connect(f);
      o.start(t); o.stop(t + dur + .5);
    }
  }

  /** Slap-Bass: kurzer Filter-„Plopp“ am Anfang jedes Tons. */
  private bass(n: number, t: number, dur: number) {
    const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    o.type = "sawtooth"; o2.type = "triangle";
    o.frequency.value = o2.frequency.value = midi(n);
    f.type = "lowpass"; f.Q.value = 6;
    f.frequency.setValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(380, t + .12);
    this.env(g, t, .3, .004, dur * .8, .06, .55);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.pan(0));
    o.start(t); o2.start(t); o.stop(t + dur + .1); o2.stop(t + dur + .1);
  }

  private drum(kind: "kick" | "snare" | "hat" | "open" | "crash" | "tom" | "clap" | "shaker" | "congaHi" | "congaLo" | "cowbell" | "tamb", t: number, pitch = 1) {
    const PAN: Partial<Record<typeof kind, number>> = { hat: .3, open: .3, shaker: -.5, congaHi: .55, congaLo: .4, cowbell: -.3, tamb: -.6 };
    const out = this.pan(PAN[kind] ?? 0);
    const noise = (dur: number, vol: number, type: BiquadFilterType, f: number, q = 1) => {
      const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      s.buffer = this.noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(fl); fl.connect(g); g.connect(out);
      s.start(t, Math.random() * 2); s.stop(t + dur + .05);
    };
    const body = (f0: number, f1: number, dur: number, vol: number) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .05);
    };
    switch (kind) {
      case "kick": body(140, 42, .22, .75); break;
      case "snare": body(210, 150, .1, .25); noise(.16, .38, "bandpass", 2200, .7); break;
      case "hat": noise(.035, .09, "highpass", 8000); break;
      case "open": noise(.22, .07, "highpass", 7000); break;
      case "crash": noise(1.4, .14, "highpass", 5000); break;
      case "tom": body(180 * pitch, 90 * pitch, .2, .45); break;
      case "clap": [0, .011, .023].forEach(d => { const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
          s.buffer = this.noise; fl.type = "bandpass"; fl.frequency.value = 1300; fl.Q.value = 1.4;
          g.gain.setValueAtTime(.32, t + d); g.gain.exponentialRampToValueAtTime(.0001, t + d + (d > .02 ? .16 : .03));
          s.connect(fl); fl.connect(g); g.connect(out); s.start(t + d, Math.random() * 2); s.stop(t + d + .2); }); break;
      case "shaker": noise(.05, .045, "highpass", 6500); break;
      case "congaHi": body(420, 340, .16, .32); break;
      case "congaLo": body(270, 215, .22, .38); break;
      case "cowbell": {
        const f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
        f.type = "bandpass"; f.frequency.value = 800; f.Q.value = 3; f.connect(g); g.connect(out);
        g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.0001, t + .28);
        for (const hz of [545, 815]) { const o = this.ctx.createOscillator(); o.type = "square"; o.frequency.value = hz; o.connect(f); o.start(t); o.stop(t + .3); }
        break;
      }
      case "tamb": noise(.13, .06, "highpass", 9000); body(5200, 4800, .06, .03); break;
    }
  }

  // ---------- ein Takt ----------
  private playBar(index: number, t0: number) {
    let i = index, sec = SONG[0];
    for (const s of SONG) { if (i < s.bars.length) { sec = s; break; } i -= s.bars.length; }
    const bar = sec.bars[i], tr = sec.tr, last = i === sec.bars.length - 1;
    const at = (e: number) => t0 + BEAT * Math.floor(e / 2) + (e % 2 ? BEAT * SWING : 0);   // Zeit der e-ten Achtel

    // Melodie: Ton hält, solange „0“ folgt
    bar.mel.forEach((n, e) => {
      if (n <= 0) return;
      let len = 1;
      while (e + len < 8 && bar.mel[e + len] === 0) len++;
      this.lead(n + tr, at(e), at(e + len) - at(e));
    });
    for (let half = 0; half < 2; half++) {
      const c = CH[bar.ch[half]], ts = t0 + half * 2 * BEAT;
      this.pad(c.pad.map(n => n + tr), ts, 2 * BEAT);
      // Bass: Grundton, Oktave, Quinte – hüpfend
      [0, 12, 7, 12].forEach((off, k) => { if (k !== 1 || !this.night) this.bass(c.root + off + tr, at(half * 4 + k), BEAT * .45); });
      if (!this.night) c.pad.forEach((n, k) => { this.arp(n + 12 + tr, at(half * 4 + k)); });
    }
    if (this.night) return;
    // Schlagzeug: Kick 1 & 3, Snare 2 & 4, Hi-Hat auf jeder Achtel, Becken zu Beginn jedes Teils, Fill am Ende
    if (i === 0) this.drum("crash", t0);
    for (let e = 0; e < 8; e++) {
      if (e === 0 || e === 4 || e === 5) this.drum("kick", at(e));
      if (e === 2 || e === 6) this.drum("snare", at(e));
      this.drum(e === 7 ? "open" : "hat", at(e));
    }
    if (last) [1.2, 1, .85, .7].forEach((p, k) => this.drum("tom", t0 + 3 * BEAT + k * BEAT / 4, p));
    // mehr Rhythmus: Klatschen auf 2 und 4, Shaker auf jeder Sechzehntel, Bongos, dazu Kuhglocke (A-Teil) oder Tamburin (B-Teil)
    for (let e = 0; e < 8; e++) {
      const t = at(e), half = (at(e + 1) - t) / 2;
      this.drum("shaker", t); this.drum("shaker", t + half);
      if (e === 2 || e === 6) this.drum("clap", t + .008);
    }
    const BONGO = [null, "congaHi", null, "congaHi", "congaLo", null, "congaHi", "congaLo"] as const;
    if (!last) BONGO.forEach((k, e) => { if (k) this.drum(k, at(e)); });
    if (sec.bars === A) { if (i % 2 === 1) [3, 7].forEach(e => this.drum("cowbell", at(e))); }
    else [1, 3, 5, 7].forEach(e => this.drum("tamb", at(e)));
  }
}
