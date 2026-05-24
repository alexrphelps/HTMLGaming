(function(ns) {
  ns.PRESETS = {
    spots: {
      name: 'Leopard Spots',
      model: 'classic', viewMode: 'beauty', palette: 'neon',
      feed: 0.036, kill: 0.062, diffU: 1.00, diffV: 0.50,
      gain: 1.00, exp: 2.00, sat: 0.00, noise: 0.0000,
      flowX: 0.00, flowY: 0.00, anisotropy: 0.00, diag: 0.05,
      dt: 1.00, speed: 2, seedDensity: 30, seedRadius: 6, seedStyle: 'spots'
    },
    maze: {
      name: 'Zebra Maze',
      model: 'classic', viewMode: 'beauty', palette: 'mono',
      feed: 0.029, kill: 0.057, diffU: 1.00, diffV: 0.47,
      gain: 1.00, exp: 2.00, sat: 0.00, noise: 0.0000,
      flowX: 0.00, flowY: 0.00, anisotropy: 0.12, diag: 0.05,
      dt: 1.00, speed: 2, seedDensity: 28, seedRadius: 6, seedStyle: 'maze'
    },
    coral: {
      name: 'Coral Bloom',
      model: 'classic', viewMode: 'beauty', palette: 'forest',
      feed: 0.054, kill: 0.062, diffU: 1.00, diffV: 0.42,
      gain: 1.08, exp: 2.00, sat: 0.00, noise: 0.0004,
      flowX: 0.00, flowY: 0.00, anisotropy: 0.03, diag: 0.05,
      dt: 1.00, speed: 2, seedDensity: 18, seedRadius: 4, seedStyle: 'spots'
    },
    finger: {
      name: 'Finger Swirl',
      model: 'classic', viewMode: 'beauty', palette: 'ice',
      feed: 0.031, kill: 0.058, diffU: 1.05, diffV: 0.44,
      gain: 1.00, exp: 2.00, sat: 0.00, noise: 0.0000,
      flowX: 0.00, flowY: 0.00, anisotropy: 0.18, diag: 0.04,
      dt: 1.00, speed: 2, seedDensity: 28, seedRadius: 6, seedStyle: 'finger'
    },
    bubble: {
      name: 'Bubble Cells',
      model: 'saturating', viewMode: 'beauty', palette: 'lava',
      feed: 0.043, kill: 0.060, diffU: 1.00, diffV: 0.36,
      gain: 1.35, exp: 2.00, sat: 1.60, noise: 0.0002,
      flowX: 0.00, flowY: 0.00, anisotropy: 0.00, diag: 0.05,
      dt: 0.95, speed: 2, seedDensity: 22, seedRadius: 5, seedStyle: 'spots'
    },
    crystal: {
      name: 'Crystal Veins',
      model: 'cubic', viewMode: 'beauty', palette: 'ice',
      feed: 0.041, kill: 0.063, diffU: 1.00, diffV: 0.38,
      gain: 1.30, exp: 3.10, sat: 0.00, noise: 0.0001,
      flowX: 0.02, flowY: -0.01, anisotropy: 0.08, diag: 0.03,
      dt: 0.85, speed: 2, seedDensity: 20, seedRadius: 4, seedStyle: 'spots'
    },
    storm: {
      name: 'Drift Storm',
      model: 'classic', viewMode: 'beauty', palette: 'neon',
      feed: 0.034, kill: 0.060, diffU: 1.00, diffV: 0.47,
      gain: 1.02, exp: 2.00, sat: 0.00, noise: 0.0004,
      flowX: 0.12, flowY: -0.08, anisotropy: 0.10, diag: 0.05,
      dt: 0.95, speed: 2, seedDensity: 26, seedRadius: 5, seedStyle: 'spots'
    },
    chaos: {
      name: 'Controlled Chaos',
      model: 'cubic', viewMode: 'beauty', palette: 'lava',
      feed: 0.058, kill: 0.061, diffU: 1.00, diffV: 0.33,
      gain: 1.50, exp: 2.60, sat: 0.00, noise: 0.0015,
      flowX: -0.04, flowY: 0.06, anisotropy: 0.22, diag: 0.02,
      dt: 0.85, speed: 3, seedDensity: 34, seedRadius: 4, seedStyle: 'spots'
    }
  };
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
