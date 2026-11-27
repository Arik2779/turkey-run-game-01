// Tiny synthesised sound effects, built with WebAudio oscillators only — no audio
// files, no network. Created lazily on the first user gesture (browsers block audio
// before one) and silent until then.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      try {
        const AudioContext = window.AudioContext ?? window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context !== null && context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }

  /** One oscillator blip: frequency slides from `from` to `to` over `seconds`. */
  function blip(from, to, seconds, type, gainValue, delay = 0) {
    const audio = ensure();
    if (audio === null || muted) return;
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(gainValue, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  return {
    /** Call on any user gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** Two quick low gobbles: the turkey's happy cluck. */
    gobble() {
      blip(320, 180, 0.09, 'square', 0.08);
      blip(300, 160, 0.09, 'square', 0.08, 0.11);
    },
    jump() {
      blip(280, 640, 0.16, 'sine', 0.1);
    },
    corn() {
      blip(880, 880, 0.07, 'sine', 0.09);
      blip(1320, 1320, 0.1, 'sine', 0.09, 0.07);
    },
    stumble() {
      blip(220, 70, 0.3, 'sawtooth', 0.14);
    },
    caught() {
      blip(392, 392, 0.18, 'triangle', 0.12);
      blip(370, 370, 0.18, 'triangle', 0.12, 0.2);
      blip(311, 220, 0.5, 'triangle', 0.12, 0.4);
    },
    escaped() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((note, index) => blip(note, note, 0.16, 'triangle', 0.11, index * 0.13));
    },
  };
}
