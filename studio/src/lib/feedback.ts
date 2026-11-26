const MUTE_KEY = 'ql.sound.muted';

type ClickKind = 'tick' | 'thunk';

let context: AudioContext | null = null;
let muted = readMuted();

function readMuted() {
  try {
    return window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  if (!context) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function isMuted() {
  return muted;
}

export function setMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    /* storage can be unavailable; the in-memory flag still applies */
  }
}

/** Short synthesised click. No assets, no network. */
export function playClick(kind: ClickKind = 'tick') {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = kind === 'thunk' ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(kind === 'thunk' ? 210 : 1180, now);
  osc.frequency.exponentialRampToValueAtTime(kind === 'thunk' ? 120 : 720, now + 0.05);
  const peak = kind === 'thunk' ? 0.09 : 0.045;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'thunk' ? 0.13 : 0.075));
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);

  if (kind === 'thunk') {
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(96, now);
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    body.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    body.start(now);
    body.stop(now + 0.22);
  }
}
