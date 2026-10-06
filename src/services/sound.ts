// Sons curtos sintetizados (sem arquivos de áudio). Isolado aqui para que um
// app nativo possa trocar por haptics/áudio da plataforma.

export type SoundName = 'move' | 'capture' | 'check' | 'win' | 'lose' | 'error' | 'success';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.08) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + start;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

const SOUNDS: Record<SoundName, () => void> = {
  move: () => tone(220, 0, 0.07, 'triangle', 0.12),
  capture: () => {
    tone(180, 0, 0.06, 'square', 0.06);
    tone(120, 0.04, 0.09, 'triangle', 0.12);
  },
  check: () => {
    tone(660, 0, 0.09, 'triangle');
    tone(880, 0.08, 0.12, 'triangle');
  },
  success: () => {
    tone(523, 0, 0.1);
    tone(784, 0.09, 0.16);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.22));
  },
  lose: () => {
    [392, 330, 262].forEach((f, i) => tone(f, i * 0.14, 0.25, 'triangle'));
  },
  error: () => tone(150, 0, 0.14, 'sawtooth', 0.05),
};

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  try {
    SOUNDS[name]();
  } catch {
    /* áudio é opcional */
  }
}
