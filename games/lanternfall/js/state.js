(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};
  const { CONFIG } = Lanternfall;
  const { easeInOut, lerp, tileKey } = Lanternfall.math;

  function createPlayer() {
    return {
      gx: 0,
      gy: 0,
      fx: 0,
      fy: 0,
      tx: 0,
      ty: 0,
      t: 0,
      moving: false,
      facing: "down"
    };
  }

  function createInitialState(seed = CONFIG.defaultSeed) {
    return {
      seed,
      explored: new Set(),
      particles: [],
      score: 0,
      lanternLevel: 1,
      visionRadius: CONFIG.vision.min,
      speedRemaining: 0,
      compassPing: null,
      started: false,
      paused: false,
      lastTime: 0,
      player: createPlayer()
    };
  }

  function resetRunState(state, seed) {
    state.seed = seed;
    state.explored.clear();
    state.particles.length = 0;
    state.score = 0;
    state.lanternLevel = 1;
    state.visionRadius = CONFIG.vision.min;
    state.speedRemaining = 0;
    state.compassPing = null;
    state.started = true;
    state.paused = false;
    state.lastTime = 0;
    Object.assign(state.player, createPlayer());
  }

  function getPlayerPos(state) {
    const { player } = state;
    if (player.moving) {
      const eased = easeInOut(player.t);
      return {
        x: lerp(player.fx, player.tx, eased),
        y: lerp(player.fy, player.ty, eased)
      };
    }

    return { x: player.gx, y: player.gy };
  }

  function markExplored(state, x, y) {
    state.explored.add(tileKey(x, y));
  }

  Lanternfall.createPlayer = createPlayer;
  Lanternfall.createInitialState = createInitialState;
  Lanternfall.resetRunState = resetRunState;
  Lanternfall.getPlayerPos = getPlayerPos;
  Lanternfall.markExplored = markExplored;
})();
