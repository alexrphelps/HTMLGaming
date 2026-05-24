(function(ns) {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  class ReactionDiffusionState {
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.size = width * height;
      this.u = new Float32Array(this.size);
      this.v = new Float32Array(this.size);
      this.nextU = new Float32Array(this.size);
      this.nextV = new Float32Array(this.size);
      this.prevV = new Float32Array(this.size);
      this.steps = 0;
      this.wrapEdges = true;
      this.reset();
    }

    setWrapEdges(enabled) {
      this.wrapEdges = Boolean(enabled);
    }

    index(x, y) {
      if (this.wrapEdges) {
        x = (x + this.width) % this.width;
        y = (y + this.height) % this.height;
        return y * this.width + x;
      }
      if (x < 0 || x >= this.width || y < 0 || y >= this.height) return -1;
      return y * this.width + x;
    }

    sample(field, x, y) {
      const i = this.index(x, y);
      return i < 0 ? 0 : field[i];
    }

    reset() {
      for (let i = 0; i < this.size; i++) {
        this.u[i] = 1;
        this.v[i] = 0;
        this.prevV[i] = 0;
      }
      this.steps = 0;
    }

    snapshotFrameStart() {
      this.prevV.set(this.v);
    }

    splat(cx, cy, radius, amount = 0.8) {
      for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
        for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= radius * radius) {
            const i = this.index(x, y);
            if (i < 0) continue;
            this.u[i] = 0.32 + Math.random() * 0.22;
            this.v[i] = clamp(amount + (Math.random() - 0.5) * 0.12, 0, 1);
          }
        }
      }
    }

    randomizeSeeds(style = 'spots', count = 30, radius = 6) {
      this.reset();

      if (style === 'maze') {
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const wave = Math.sin(x * 0.13 + Math.sin(y * 0.07) * 3.6);
            if (wave > 0.83 || Math.random() < 0.003) {
              const i = y * this.width + x;
              this.u[i] = 0.50;
              this.v[i] = 0.45;
            }
          }
        }
        return;
      }

      if (style === 'finger') {
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            const dx = x - this.width / 2;
            const dy = y - this.height / 2;
            const swirl = Math.sin(Math.hypot(dx, dy) * 0.22 + Math.atan2(dy, dx) * 4.8);
            if (swirl > 0.90 || Math.random() < 0.0015) {
              const i = y * this.width + x;
              this.u[i] = 0.52;
              this.v[i] = 0.55;
            }
          }
        }
        return;
      }

      if (style === 'center') {
        this.splat(this.width / 2, this.height / 2, Math.max(8, radius * 2), 0.92);
        return;
      }

      for (let n = 0; n < count; n++) {
        const x = Math.floor(Math.random() * this.width);
        const y = Math.floor(Math.random() * this.height);
        this.splat(x, y, radius * (0.7 + Math.random() * 0.8), 0.68 + Math.random() * 0.25);
      }
    }

    swapBuffers() {
      [this.u, this.nextU] = [this.nextU, this.u];
      [this.v, this.nextV] = [this.nextV, this.v];
      this.steps++;
    }
  }

  ns.clamp = clamp;
  ns.ReactionDiffusionState = ReactionDiffusionState;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
