(function(ns) {
  class Palette {
    static map(c, mode, palette, glow = 0, edge = 0) {
      c = ns.clamp(c, 0, 1);
      glow = ns.clamp(glow, 0, 1);
      edge = ns.clamp(edge, 0, 1);

      if (palette === 'lava') {
        if (mode === 'beauty') {
          return [
            Math.round(12 + c * 230 + glow * 20),
            Math.round(10 + c * 110 + glow * 60),
            Math.round(14 + c * 25)
          ];
        }
        return [Math.round(20 + c * 235), Math.round(14 + c * 150), Math.round(12 + c * 45)];
      }

      if (palette === 'ice') {
        if (mode === 'beauty') {
          return [
            Math.round(8 + c * 85 + edge * 30),
            Math.round(28 + c * 185 + glow * 20),
            Math.round(40 + c * 215 + glow * 25)
          ];
        }
        return [Math.round(15 + c * 100), Math.round(25 + c * 190), Math.round(35 + c * 220)];
      }

      if (palette === 'forest') {
        if (mode === 'beauty') {
          return [
            Math.round(8 + c * 55),
            Math.round(14 + c * 165 + glow * 35),
            Math.round(16 + c * 78)
          ];
        }
        return [Math.round(12 + c * 80), Math.round(20 + c * 190), Math.round(16 + c * 85)];
      }

      if (palette === 'mono') {
        const q = Math.round(18 + c * 220);
        return [q, q, q];
      }

      if (mode === 'beauty') {
        return [
          Math.round(10 + c * 28 + edge * 160 + glow * 60),
          Math.round(18 + c * 180 + glow * 55),
          Math.round(34 + c * 145 + edge * 45)
        ];
      }

      return [
        Math.round(15 + c * 220),
        Math.round(20 + c * 190),
        Math.round(42 + c * 160)
      ];
    }
  }

  ns.Palette = Palette;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
