(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};

  class SynthAudio {
    constructor(hostWindow = window) {
      this.window = hostWindow;
      this.ctx = null;
      this.muted = false;
    }

    ensure() {
      if (!this.ctx) {
        const AudioContextClass = this.window.AudioContext || this.window.webkitAudioContext;
        if (AudioContextClass) {
          this.ctx = new AudioContextClass();
        }
      }

      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.muted = !this.muted;
      return this.muted;
    }

    beep(freq, duration, type = "sine", volume = 0.15, delay = 0) {
      if (this.muted || !this.ctx) return;

      const start = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    }

    sfx(kind) {
      switch (kind) {
        case "step":
          this.beep(120, 0.05, "square", 0.035);
          break;
        case "bump":
          this.beep(75, 0.09, "square", 0.08);
          break;
        case "gem":
          this.beep(880, 0.12, "triangle", 0.15);
          this.beep(1320, 0.12, "triangle", 0.1, 0.06);
          break;
        case "speed":
          this.beep(440, 0.1, "sawtooth", 0.12);
          this.beep(660, 0.12, "sawtooth", 0.1, 0.08);
          break;
        case "lantern":
          this.beep(330, 0.18, "sine", 0.15);
          this.beep(495, 0.2, "sine", 0.12, 0.1);
          this.beep(660, 0.22, "sine", 0.1, 0.2);
          break;
        case "compass":
          this.beep(523, 0.1, "sine", 0.12);
          this.beep(784, 0.14, "sine", 0.1, 0.1);
          break;
      }
    }
  }

  Lanternfall.SynthAudio = SynthAudio;
})();
