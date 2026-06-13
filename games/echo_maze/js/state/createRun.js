(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function createRun(seed = Math.floor(Math.random() * 1_000_000_000), options = {}) {
    const gameMode = options.gameMode || 'classic';
    const state = {
      seed,
      mode: options.mode || 'mainMenu',
      gameMode,
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
      phaseTrailClock: 0,
      ambientClock: 0,
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
      danger: 0,
      dangerPulse: 0,
      upgrades: em.createUpgradeState ? em.createUpgradeState() : {},
      pendingUpgrades: [],
      pendingAnchorAdvance: null,
      enemies: [],
      enemySpawnClock: 6,
      maxDepth: 0,
      phaseUsesSinceAnchor: 0,
      bestAnchorBonus: 0,
      player: {
        x: em.CONFIG.cell / 2,
        y: em.CONFIG.cell / 2,
        r: em.CONFIG.playerRadius,
        speed: em.CONFIG.baseSpeed,
        vision: em.CONFIG.baseVision,
        visionBonus: 0,
        fuel: 100,
        maxFuel: 100,
        phaseCharges: 1,
        phaseTimer: 0,
        phaseDuration: em.CONFIG.phaseDuration,
        phaseCooldown: em.CONFIG.phaseCooldown,
        phaseCooldownTimer: 0,
        pickupRadius: 13,
        compass: 0,
        compassObjective: 0,
        compassItems: 0,
        compassDanger: 0,
        minimapBonus: 0,
        shields: 1,
        health: 3,
        battery: 0,
        angle: 0
      },
      objective: null,
      exitPortal: null,
      warden: null,
      finalStats: null,
      tutorialStep: 0,
      tutorialSequence: [],
      tutorialTarget: null,
      tutorialTargets: [],
      tutorialInfo: null,
      tutorialCompleted: false
    };

    em.ensureSpawnRoom(state);
    if (em.updateLanternVision) em.updateLanternVision(state);
    em.revealAround(state, 0, 0, em.CONFIG.baseVision);

    if (gameMode === 'beginner' && em.initBeginnerTutorial) {
      em.initBeginnerTutorial(state);
    } else {
      state.objective = em.makeObjective(state, 1);
      em.addMessage(state, 'Follow the compass and stabilize five Echo Anchors.');
      em.addMessage(state, 'Classic Run ready.');
    }

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
