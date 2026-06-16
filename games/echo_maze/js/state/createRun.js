(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function createRun(seed = Math.floor(Math.random() * 1_000_000_000), options = {}) {
    const gameMode = options.gameMode || 'classic';
    const isBeginner = gameMode === 'beginner';
    const isNoExit = gameMode === 'noExit';
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
      objectives: [],
      enemySpawnClock: 6,
      maxDepth: 0,
      lastAnchorRadius: 0,
      anchorMinRadius: 0,
      phaseUsesSinceAnchor: 0,
      bestAnchorBonus: 0,
      player: {
        x: em.CONFIG.cell / 2,
        y: em.CONFIG.cell / 2,
        r: em.CONFIG.playerRadius,
        speed: em.CONFIG.baseSpeed,
        speedBoostTimer: 0,
        speedBoostMultiplier: 1,
        vision: em.CONFIG.baseVision,
        minVision: em.CONFIG.baseVision,
        visionBonus: 0,
        phaseCharges: isBeginner ? 0 : 1,
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
        shields: isBeginner ? 0 : 1,
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
      tutorialCompleted: false,
      tutorialDiscovered: new Set(),
      beginnerItemEpoch: 0
    };

    if (isNoExit) {
      state.void = {
        x: em.CONFIG.cell / 2,
        y: em.CONFIG.cell / 2,
        active: false,
        radius: em.CONFIG.noExit.voidStartRadiusCells * em.CONFIG.cell,
        startedAt: null
      };
    }

    em.ensureSpawnRoom(state);
    if (em.updateLanternVision) em.updateLanternVision(state, 0);
    em.revealAround(state, 0, 0, em.CONFIG.baseVision);

    if (gameMode === 'beginner' && em.initBeginnerTutorial) {
      em.initBeginnerTutorial(state);
    } else {
      if (em.makeObjectives) {
        state.objectives = em.makeObjectives(state, 1);
        state.objective = em.closestActiveAnchor ? em.closestActiveAnchor(state) : (state.objectives[0] || null);
      } else {
        state.objective = em.makeObjective(state, 1);
        state.objectives = state.objective ? [state.objective] : [];
      }
      em.addMessage(state, 'Explore for Compass Lenses to tune Anchor signals.');
      em.addMessage(state, isNoExit ? 'No Exit: the maze has no escape. Keep moving outward.' : 'Classic Run ready.');
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
      seed: state.seed,
      gameMode: state.gameMode
    };
  }

  Object.assign(em, { createRun, buildFinalStats });
  window.EchoMaze = em;
})();
