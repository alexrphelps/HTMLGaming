(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function createRun(seed = Math.floor(Math.random() * 1_000_000_000)) {
    const state = {
      seed,
      mode: 'start',
      previousMode: 'playing',
      time: 0,
      anchorClock: 0,
      showMini: true,
      messages: [],
      particles: [],
      floating: [],
      pulses: [],
      crumbs: [],
      crumbClock: 0,
      camera: { x: em.CONFIG.cell / 2, y: em.CONFIG.cell / 2 },
      screenShake: 0,
      screenPulse: 0,
      revealed: new Set(),
      collected: new Set(),
      chunkCache: new Map(),
      score: 0,
      items: 0,
      anchors: 0,
      tier: 1,
      maxDepth: 0,
      phaseUsesSinceAnchor: 0,
      bestAnchorBonus: 0,
      player: {
        x: em.CONFIG.cell / 2,
        y: em.CONFIG.cell / 2,
        r: em.CONFIG.playerRadius,
        speed: em.CONFIG.baseSpeed,
        vision: em.CONFIG.baseVision,
        phaseCharges: 1,
        phaseTimer: 0,
        pickupRadius: 13,
        compass: 0,
        shields: 1,
        health: 3,
        battery: 0,
        angle: 0
      },
      objective: null,
      exitPortal: null,
      warden: null,
      finalStats: null
    };

    em.ensureSpawnRoom(state);
    em.revealAround(state, 0, 0, em.CONFIG.baseVision);
    state.objective = em.makeObjective(state, 1);
    em.addMessage(state, 'Follow the compass and stabilize five Echo Anchors.');
    em.addMessage(state, 'Seed ' + seed + '. Press Enter to begin.');

    return state;
  }

  function buildFinalStats(state, reason) {
    return {
      reason,
      score: state.score,
      anchors: state.anchors,
      items: state.items,
      revealed: state.revealed.size,
      time: state.time,
      depth: state.maxDepth,
      seed: state.seed
    };
  }

  Object.assign(em, { createRun, buildFinalStats });
  window.EchoMaze = em;
})();
