(function(ns) {
  class CanvasRenderer {
    constructor(canvas, state, simulation) {
      this.canvas = canvas;
      this.state = state;
      this.simulation = simulation;
      this.ctx = canvas.getContext('2d');
      this.image = this.ctx.createImageData(state.width, state.height);
    }

    render(params, fps) {
      const state = this.state;
      let active = 0;
      let sumU = 0;
      let sumV = 0;
      let sumR = 0;
      let sumChange = 0;
      let meanBeauty = 0;
      let meanBeauty2 = 0;

      for (let i = 0; i < state.size; i++) {
        const a = state.u[i];
        const b = state.v[i];
        const reaction = this.simulation.reactionFor(a, b, params);
        const beauty = ns.clamp(b * 2.15 - a * 0.14, 0, 1);
        const change = Math.abs(b - state.prevV[i]);

        if (beauty > 0.22) active++;
        sumU += a;
        sumV += b;
        sumR += reaction;
        sumChange += change;
        meanBeauty += beauty;
        meanBeauty2 += beauty * beauty;

        let rr = 0;
        let gg = 0;
        let bb = 0;
        const p = i * 4;

        if (params.view === 'u') {
          [rr, gg, bb] = ns.Palette.map(a, 'u', params.palette);
        } else if (params.view === 'v') {
          [rr, gg, bb] = ns.Palette.map(ns.clamp(b * 2.0, 0, 1), 'v', params.palette);
        } else if (params.view === 'reaction') {
          [rr, gg, bb] = ns.Palette.map(ns.clamp(reaction * 28, 0, 1), 'reaction', params.palette);
        } else if (params.view === 'edge') {
          [rr, gg, bb] = ns.Palette.map(ns.clamp(change * 70, 0, 1), 'edge', params.palette);
        } else {
          [rr, gg, bb] = ns.Palette.map(
            beauty,
            'beauty',
            params.palette,
            ns.clamp(reaction * 14, 0, 1),
            ns.clamp(change * 55, 0, 1)
          );
        }

        this.image.data[p] = rr;
        this.image.data[p + 1] = gg;
        this.image.data[p + 2] = bb;
        this.image.data[p + 3] = 255;
      }

      this.ctx.putImageData(this.image, 0, 0);

      const avgU = sumU / state.size;
      const avgV = sumV / state.size;
      const avgR = sumR / state.size;
      const avgChange = sumChange / state.size;
      const coverage = active / state.size;
      meanBeauty /= state.size;
      meanBeauty2 /= state.size;

      return {
        steps: state.steps,
        fps,
        coverage,
        avgReaction: avgR,
        contrast: Math.sqrt(Math.max(0, meanBeauty2 - meanBeauty * meanBeauty)),
        drift: params.driftMag,
        avgU,
        avgV,
        avgChange
      };
    }
  }

  ns.CanvasRenderer = CanvasRenderer;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
