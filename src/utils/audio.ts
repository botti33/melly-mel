// Native Web Audio Synthesizer for cozy, ambient sound effects (soft pencil, paper scratch, stamps)
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

// 1. Soft Pencil Scratch Sound
// Uses narrow bandpass-filtered white noise with very short pulses to simulate lead scratching paper
export function playPencilSound(velocity: number) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Create Noise Buffer
    const bufferSize = ctx.sampleRate * 0.04; // 40ms pulse
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound like paper scraping (mid-high frequencies)
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200 + Math.random() * 400, now);
    filter.Q.setValueAtTime(4, now);

    // Dynamic Volume based on pencil pressure/speed
    const gainNode = ctx.createGain();
    const volume = Math.min(0.012, 0.002 + velocity * 0.01);
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
}

// 2. Paper Scraping/Flipping sound
// Sweeping noise with low pass filtering to mimic soft pages sliding or turning
export function playPaperFlipSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.45;

    // Create noise buffers (mix of brown and white noise)
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise integration
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Sweeping state filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + duration);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.08); // Fade in
    gainNode.gain.linearRampToValueAtTime(0.04, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration); // Fade out

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
}

// 3. Stamp pop / ink tap sound
// Gentle marimba-like sinusoidal pluck with low resonance to mimic a wooden/rubber stamp press
export function playStampSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Sine pluck
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now); // Sweet middle G
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.12);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.07, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    // Low pass filter to keep it woody and gentle, removing harsh electronic frequencies
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(450, now);

    osc.connect(lp);
    lp.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
}

// 4. Sparkle/Magic Sound
// Clean resonant bell/sparkle sound for the magical sparkle brush
export function playSparkleSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Very tiny randomized glass-like bell chimes
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const pitch = 1600 + Math.random() * 800; // randomized crystal pitch
    osc.frequency.setValueAtTime(pitch, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.015, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
}

// 5. Tear out page / Paper rip sound
export function playTearSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.35;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Dynamic bandpass filter simulating paper fiber friction tearing high pitch
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(1100, now + duration);
    filter.Q.setValueAtTime(1.5, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.05, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    noise.start(now);
  } catch (e) {
    console.warn('Audio synthesis failed:', e);
  }
}
