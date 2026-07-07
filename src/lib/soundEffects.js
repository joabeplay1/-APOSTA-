const AudioCtx = window.AudioContext || window.webkitAudioContext;

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.15) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playApplause() {
  const ctx = getCtx();
  const duration = 1.5;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.max(0, 1 - i / bufferSize);
    data[i] = (Math.random() * 2 - 1) * env * 0.3;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 0.5;
  source.connect(filter);
  filter.connect(ctx.destination);
  source.start();
}

export function playDrumRoll() {
  for (let i = 0; i < 12; i++) {
    setTimeout(() => playTone(120 + Math.random() * 30, 0.08, 'triangle', 0.2), i * 60);
  }
  setTimeout(() => playTone(80, 0.3, 'triangle', 0.3), 750);
}

export function playLaugh() {
  const notes = [400, 500, 400, 500, 450, 380];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.12, 'sine', 0.1), i * 100);
  });
}

export function playCircusJingle() {
  const melody = [523, 587, 659, 698, 784, 698, 659, 587];
  melody.forEach((n, i) => {
    setTimeout(() => playTone(n, 0.15, 'square', 0.08), i * 120);
  });
}