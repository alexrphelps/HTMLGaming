(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function startRun(state) {
    if (state.mode === 'start') {
      state.mode = 'playing';
      em.addMessage(state, 'The maze wakes slowly. Find the first Anchor.');
    }
  }

  function pauseRun(state) {
    if (state.mode === 'playing') {
      state.previousMode = 'playing';
      state.mode = 'paused';
    } else if (state.mode === 'paused') {
      state.mode = state.previousMode || 'playing';
    }
  }

  function endRun(state, mode, reason) {
    state.mode = mode;
    state.finalStats = em.buildFinalStats(state, reason);
    state.screenPulse = 1;
  }

  function checkObjective(state, pc) {
    const obj = state.objective;

    if (obj && pc.x === obj.x && pc.y === obj.y) {
      stabilizeAnchor(state, obj);
      return;
    }

    if (state.exitPortal && pc.x === state.exitPortal.x && pc.y === state.exitPortal.y) {
      state.score += 1200 + state.player.health * 250 + state.player.shields * 150;
      endRun(state, 'victory', 'You stabilized the chain and escaped through the Exit Portal.');
    }
  }

  function stabilizeAnchor(state, obj) {
    const elapsed = Math.max(1, state.time - obj.createdAt);
    const parTime = Math.max(35, obj.pathLength * 0.78);
    const speedBonus = Math.max(0, Math.round((parTime - elapsed) * (6 + obj.tier)));
    const phasePenalty = state.phaseUsesSinceAnchor * 35;
    const bonus = Math.max(0, speedBonus - phasePenalty);
    const reward = obj.baseReward + bonus;

    state.score += reward;
    state.bestAnchorBonus = Math.max(state.bestAnchorBonus, bonus);
    state.anchors++;
    state.tier = state.anchors + 1;
    state.phaseUsesSinceAnchor = 0;
    state.anchorClock = 0;
    state.player.vision = Math.min(11.75, state.player.vision + 0.22);
    state.player.phaseCharges = Math.min(9, state.player.phaseCharges + 1);
    state.player.health = Math.min(3, state.player.health + (state.anchors % 2 === 0 ? 1 : 0));
    em.revealAround(state, obj.x, obj.y, 9 + Math.min(7, state.anchors));

    const wx = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    const wy = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    em.addPulse(state, wx, wy, em.CONFIG.cell * (10 + state.anchors), 1.25, '#ffe27a');
    em.addParticles(state, wx, wy, '#ffe27a', 34);
    em.addFloatingText(state, 'Anchor +' + reward, wx, wy - 12, '#ffe27a');
    state.screenPulse = 0.7;
    state.screenShake = Math.max(state.screenShake, 5);

    if (state.anchors === 1) em.spawnWarden(state);

    if (state.anchors >= em.CONFIG.runAnchors) {
      state.objective = null;
      state.exitPortal = em.makeExitPortal(state);
      em.revealAround(state, state.exitPortal.x, state.exitPortal.y, 4.5 + state.player.compass);
      em.addMessage(state, 'Anchor chain stabilized. The Exit Portal has opened.');
    } else {
      state.objective = em.makeObjective(state, state.tier);
      em.addMessage(state, obj.name + ' stabilized. +' + reward + '. Next signal is farther out.');
    }
  }

  Object.assign(em, { startRun, pauseRun, endRun, checkObjective, stabilizeAnchor });
  window.EchoMaze = em;
})();
