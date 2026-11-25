// Original score: "Afterimage Interchange". Synthesized locally; no media assets.
const BEAT = 60 / 91;
const CHORDS = [
  [45, 57, 60, 64, 67, 71], [41, 53, 57, 60, 64, 67],
  [38, 53, 57, 60, 64, 69], [40, 56, 59, 62, 65, 71],
  [45, 55, 60, 64, 67, 72], [43, 55, 59, 62, 66, 71],
  [41, 53, 57, 60, 64, 69], [40, 56, 59, 62, 66, 71],
];
const MOTIF = [
  [76, 0], [79, 3], [83, 6], [81, 10], [76, 13],
  [72, 16], [76, 20], [79, 22], [76, 27], [72, 30],
];
const dbHz = (m) => 440 * 2 ** ((m - 69) / 12);
const limit = (n) => Math.max(0, Math.min(1, Number(n) || 0));

export function createAudio() {
  let ctx, master, music, fxBus, engine, engineVolume, engineFilter, skid, skidVolume, noise;
  let delay, timer, next, step;
  let enabled = true;
  let running = false;
  let generation = 0;
  let motion = { speed: 0, boost: false, drift: false };
  const voices = new Set();

  function gain(level, dest) {
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(dest);
    return g;
  }

  function init() {
    if (ctx) return true;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return false;
    ctx = new Audio();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -21;
    compressor.ratio.value = 3.5;
    compressor.connect(ctx.destination);
    master = gain(0, compressor);
    music = gain(0.72, master);
    fxBus = gain(0.76, master);
    delay = ctx.createDelay(1);
    delay.delayTime.value = BEAT * 0.75;
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 2100;
    delay.connect(dark);
    dark.connect(gain(0.21, delay));
    dark.connect(gain(0.27, music));

    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const samples = noise.getChannelData(0);
    let rand = 197157;
    for (let i = 0; i < samples.length; i++) {
      rand = (Math.imul(rand, 1664525) + 1013904223) >>> 0;
      samples[i] = (rand / 4294967296) * 2 - 1;
    }
    engineVolume = gain(0, master);
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 180;
    engineFilter.connect(engineVolume);
    engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 40;
    engine.connect(engineFilter);
    engine.start();
    skidVolume = gain(0, master);
    const skidColor = ctx.createBiquadFilter();
    skidColor.type = 'bandpass';
    skidColor.frequency.value = 1800;
    skidColor.Q.value = 1.0;
    skidColor.connect(skidVolume);
    skid = ctx.createBufferSource();
    skid.buffer = noise;
    skid.loop = true;
    skid.connect(skidColor);
    skid.start();
    return true;
  }

  function track(source) {
    voices.add(source);
    source.onended = () => voices.delete(source);
  }

  function tone({ hz, endHz, at, length, level, type = 'triangle', attack = 0.012, dest = music, echo = false }) {
    const voice = ctx.createOscillator();
    const amp = ctx.createGain();
    voice.type = type;
    voice.frequency.setValueAtTime(Math.max(10, hz), at);
    if (endHz) voice.frequency.exponentialRampToValueAtTime(Math.max(10, endHz), at + length * 0.84);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(level, at + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
    voice.connect(amp);
    amp.connect(dest);
    if (echo) amp.connect(delay);
    track(voice);
    voice.start(at);
    voice.stop(at + length + 0.02);
  }

  function hiss({ at, length, hz, level, type = 'highpass', dest = music }) {
    const hit = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    hit.buffer = noise;
    filter.type = type;
    filter.frequency.value = hz;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(level, at + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
    hit.connect(filter);
    filter.connect(amp);
    amp.connect(dest);
    track(hit);
    hit.start(at);
    hit.stop(at + length + 0.015);
  }

  function phrase(t, i) {
    const bar = Math.floor(i / 16);
    const beat = i % 16;
    const chord = CHORDS[bar % CHORDS.length];
    if (beat === 0) {
      chord.slice(1).forEach((m, k) => {
        const hz = dbHz(m);
        tone({ hz, at: t + k * 0.033, length: BEAT * 4.18, level: 0.0095, type: 'sine', attack: 0.12 });
        tone({ hz: hz * 1.003, at: t + k * 0.033, length: BEAT * 4.13, level: 0.004, attack: 0.2 });
      });
    }
    if ([0, 6, 8, 14].includes(beat)) {
      const m = chord[0] - 12 + (beat === 14 ? 12 : 0);
      tone({ hz: dbHz(m), at: t, length: BEAT * (beat === 0 ? 1.15 : 0.43), level: 0.073, type: 'sine' });
    }
    if (beat === 0 || beat === 8 || (beat === 11 && bar % 2)) {
      tone({ hz: 112, endHz: 43, at: t, length: 0.25, level: 0.18, type: 'sine', attack: 0.006 });
    }
    if (beat === 4 || beat === 12) {
      hiss({ at: t, length: 0.19, hz: 1500, level: 0.06, type: 'bandpass' });
      tone({ hz: 149, endHz: 99, at: t, length: 0.11, level: 0.038, type: 'sine', attack: 0.006 });
    }
    if (beat % 2 === 0 || (beat === 15 && bar % 2)) {
      hiss({ at: t, length: beat % 4 ? 0.10 : 0.055, hz: 7200, level: beat % 4 ? 0.024 : 0.014 });
    }
    const melody = MOTIF.find(([, pos]) => pos === i % 32);
    if (melody) {
      const note = melody[0] + (bar % 8 >= 4 && beat % 3 === 0 ? -5 : 0);
      tone({ hz: dbHz(note), at: t, length: BEAT * 0.74, level: 0.050, attack: 0.019, echo: true });
      tone({ hz: dbHz(note + 12), at: t + 0.013, length: BEAT * 0.51, level: 0.010, type: 'sine', echo: true });
    }
  }

  function tick() {
    if (!running || ctx.state !== 'running') return;
    if (next < ctx.currentTime - 0.12) next = ctx.currentTime + 0.025;
    while (next < ctx.currentTime + 0.16) {
      phrase(next, step);
      const straight = BEAT / 4;
      next += straight * (step % 2 ? 0.94 : 1.06);
      step++;
    }
  }

  function applyDrive() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const s = limit(motion.speed);
    const active = running && enabled;
    engine.frequency.setTargetAtTime(35 + s * 80 + (motion.boost ? 20 : 0), now, 0.075);
    engineFilter.frequency.setTargetAtTime(190 + s * 290 + (motion.boost ? 210 : 0), now, 0.12);
    engineVolume.gain.setTargetAtTime(active ? 0.012 + 0.024 * s : 0, now, 0.08);
    skidVolume.gain.setTargetAtTime(active && motion.drift ? 0.031 * s : 0, now, 0.07);
  }

  async function start() {
    if (running || !enabled) return;
    const token = ++generation;
    try {
      if (!init()) return;
      await ctx.resume();
      if (token !== generation || !enabled || ctx.state !== 'running') return;
      running = true;
      next = ctx.currentTime + 0.035;
      step = 0;
      master.gain.setTargetAtTime(0.82, ctx.currentTime, 0.08);
      applyDrive();
      tick();
      timer = setInterval(tick, 44);
    } catch {
      // The game remains playable if audio is blocked or unavailable.
    }
  }

  function stop() {
    generation++;
    running = false;
    clearInterval(timer);
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.setTargetAtTime(0, now, 0.035);
    applyDrive();
    for (const voice of voices) {
      try { voice.stop(now + 0.06); } catch { /* Already ended. */ }
    }
    voices.clear();
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stop();
    return enabled;
  }

  function setDrive(state = {}) {
    motion = { ...motion, ...state };
    applyDrive();
  }

  function fx(name) {
    if (!running || !enabled || ctx.state !== 'running') return;
    const at = ctx.currentTime + 0.01;
    const blip = (n, offset = 0, length = 0.24, level = 0.095) => tone({
      hz: dbHz(n), at: at + offset, length, level, attack: 0.014, dest: fxBus,
    });
    if (name === 'countdown') blip(69, 0, 0.19);
    if (name === 'start') [69, 76, 81].forEach((n, i) => blip(n, i * 0.055, 0.31));
    if (name === 'boost') {
      tone({ hz: 113, endHz: 390, at, length: 0.38, attack: 0.053, level: 0.09, dest: fxBus });
      hiss({ at, length: 0.30, hz: 1300, level: 0.032, dest: fxBus });
    }
    if (name === 'collision') {
      tone({ hz: 78, endHz: 31, at, length: 0.24, level: 0.17, type: 'sine', attack: 0.005, dest: fxBus });
      hiss({ at, length: 0.31, hz: 1050, level: 0.09, type: 'lowpass', dest: fxBus });
    }
    if (name === 'lap') [72, 76, 79].forEach((n, i) => blip(n, i * 0.084, 0.25, 0.082));
    if (name === 'finish') [69, 72, 76, 79, 84].forEach((n, i) => blip(n, i * 0.11, 0.6, 0.067));
    if (name === 'select') blip(76, 0, 0.11, 0.056);
  }

  return { start, stop, setEnabled, setDrive, fx };
}
