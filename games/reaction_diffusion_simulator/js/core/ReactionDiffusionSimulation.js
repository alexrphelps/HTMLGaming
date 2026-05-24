(function(ns) {
  class ReactionDiffusionSimulation {
    constructor(state) {
      this.state = state;
    }

    getParams(controls) {
      const d = Number(controls.diag.value);
      const orth = (1 - 4 * d) / 4;
      const an = Number(controls.anisotropy.value);
      const flowX = Number(controls.flowX.value);
      const flowY = Number(controls.flowY.value);

      return {
        Du: Number(controls.diffU.value),
        Dv: Number(controls.diffV.value),
        F: Number(controls.feed.value),
        K: Number(controls.kill.value),
        G: Number(controls.gain.value),
        n: Number(controls.exp.value),
        S: Number(controls.sat.value),
        dt: Number(controls.dt.value),
        noise: Number(controls.noise.value),
        flowX,
        flowY,
        model: controls.model.value,
        view: controls.viewMode.value,
        palette: controls.palette.value,
        driftMag: Math.hypot(flowX, flowY),
        weights: {
          d,
          wx: orth * (1 + an),
          wy: orth * (1 - an)
        }
      };
    }

    reactionFor(a, b, params) {
      if (params.model === 'classic') return params.G * a * b * b;
      if (params.model === 'cubic') return params.G * a * Math.pow(Math.max(0, b), params.n);
      return params.G * a * b * b / (1 + params.S * b * b);
    }

    lapAt(field, x, y, weights) {
      const state = this.state;
      return (
        -1 * state.sample(field, x, y) +
        weights.wx * state.sample(field, x - 1, y) +
        weights.wx * state.sample(field, x + 1, y) +
        weights.wy * state.sample(field, x, y - 1) +
        weights.wy * state.sample(field, x, y + 1) +
        weights.d * state.sample(field, x - 1, y - 1) +
        weights.d * state.sample(field, x + 1, y - 1) +
        weights.d * state.sample(field, x - 1, y + 1) +
        weights.d * state.sample(field, x + 1, y + 1)
      );
    }

    step(params) {
      const state = this.state;

      for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
          const i = y * state.width + x;
          const a = state.u[i];
          const b = state.v[i];

          const lapU = this.lapAt(state.u, x, y, params.weights);
          const lapV = this.lapAt(state.v, x, y, params.weights);
          const reaction = this.reactionFor(a, b, params);

          const gradX = state.sample(state.v, x - 1, y) - state.sample(state.v, x + 1, y);
          const gradY = state.sample(state.v, x, y - 1) - state.sample(state.v, x, y + 1);
          const driftTerm = params.flowX * gradX + params.flowY * gradY;
          const jitter = params.noise ? (Math.random() - 0.5) * params.noise : 0;

          const ua = a + params.dt * (params.Du * lapU - reaction + params.F * (1 - a) + jitter);
          const vb = b + params.dt * (params.Dv * lapV + reaction - (params.F + params.K) * b + driftTerm + jitter);

          state.nextU[i] = ns.clamp(ua, 0, 1);
          state.nextV[i] = ns.clamp(vb, 0, 1);
        }
      }

      state.swapBuffers();
    }
  }

  ns.ReactionDiffusionSimulation = ReactionDiffusionSimulation;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
