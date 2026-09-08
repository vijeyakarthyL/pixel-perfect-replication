let ctx: AudioContext | null = null;
let osc: OscillatorNode | null = null;
let sub: OscillatorNode | null = null;
let gain: GainNode | null = null;

export function startEngine() {
  if (typeof window === "undefined") return;
  if (ctx) return;
  try {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    ctx = new AudioCtor();
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 80;
    const shaper = ctx.createBiquadFilter();
    shaper.type = "lowpass";
    shaper.frequency.value = 1400;
    osc.connect(shaper);
    shaper.connect(gain);
    osc.start();

    sub = ctx.createOscillator();
    sub.type = "square";
    sub.frequency.value = 40;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.25;
    sub.connect(subGain);
    subGain.connect(gain);
    sub.start();
  } catch {
    ctx = null;
  }
}

export function updateEngine(rpm: number, load: number, enabled: boolean) {
  if (!ctx || !osc || !gain || !sub) return;
  const freq = 70 + rpm * 260;
  osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
  sub.frequency.setTargetAtTime(freq / 2, ctx.currentTime, 0.08);
  gain.gain.setTargetAtTime(enabled ? 0.045 + load * 0.05 : 0, ctx.currentTime, 0.1);
}

export function stopEngine() {
  if (!ctx) return;
  try {
    osc?.stop();
    sub?.stop();
    void ctx.close();
  } catch {
    /* ignore */
  }
  ctx = null;
  osc = null;
  sub = null;
  gain = null;
}
