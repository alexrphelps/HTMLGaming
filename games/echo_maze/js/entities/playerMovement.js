(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function activatePhase(state, options = {}) {
    if (!state || state.mode !== 'playing') return;
    if (!options.force && state.gameMode === 'beginner' && (!em.hasDiscoveredTutorial || !em.hasDiscoveredTutorial(state, 'phase'))) return;

    const p = state.player;
    if (!options.force && p.phaseTimer > 0) return;

    if (!options.force && p.phaseCooldownTimer > 0) {
      em.addMessage(state, 'Phase recharging: ' + p.phaseCooldownTimer.toFixed(1) + 's.');
      return;
    }

    if (p.phaseCharges <= 0) {
      em.addMessage(state, 'No Phase Crystal charged. Find one or stabilize an Anchor.');
      return;
    }

    p.phaseCharges--;
    p.phaseTimer = p.phaseDuration;
    p.phaseCooldownTimer = p.phaseCooldown;
    state.phaseUsesSinceAnchor++;
    state.screenPulse = Math.max(state.screenPulse, 0.42);
    em.addPulse(state, p.x, p.y, em.CONFIG.cell * 2.8, 0.45, '#bd8cff');
    em.addParticles(state, p.x, p.y, '#bd8cff', 18);
    em.addMessage(state, (options.force ? 'Phase Crystal overload. ' : '') + 'Phase active. Walls release you for ' + p.phaseDuration.toFixed(1) + ' seconds.');
    return true;
  }

  function usePhase(state) {
    return activatePhase(state);
  }

  function movePlayer(state, dx, dy) {
    const boost = state.player.phaseTimer > 0 ? 1.18 : 1;
    const step = em.CONFIG.cell * 0.35;
    const dist = Math.max(Math.abs(dx), Math.abs(dy)) * boost;
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let i = 0; i < steps; i++) {
      moveAxis(state, 'x', (dx * boost) / steps);
      moveAxis(state, 'y', (dy * boost) / steps);
    }
  }

  function moveAxis(state, axis, amount) {
    if (amount === 0) return;

    const p = state.player;
    const edgeEpsilon = 0.001;

    if (p.phaseTimer > 0) {
      p[axis] += amount;
      return;
    }

    let target = p[axis] + amount;
    const r = p.r - 1;

    if (axis === 'x') {
      const top = Math.floor((p.y - r + 2) / em.CONFIG.cell);
      const bottom = Math.floor((p.y + r - 2) / em.CONFIG.cell);

      if (amount > 0) {
        const startCol = Math.floor((p.x + r - edgeEpsilon) / em.CONFIG.cell);
        const endCol = Math.floor((target + r - edgeEpsilon) / em.CONFIG.cell);

        outer:
        for (let col = startCol; col <= endCol; col++) {
          for (let row = top; row <= bottom; row++) {
            if (em.isBlockedBetween(state, col, row, col + 1, row)) {
              target = Math.min(target, (col + 1) * em.CONFIG.cell - r);
              break outer;
            }
          }
        }
      } else {
        const startCol = Math.floor((p.x - r + edgeEpsilon) / em.CONFIG.cell);
        const endCol = Math.floor((target - r + edgeEpsilon) / em.CONFIG.cell);

        outer:
        for (let col = startCol; col >= endCol; col--) {
          for (let row = top; row <= bottom; row++) {
            if (em.isBlockedBetween(state, col, row, col - 1, row)) {
              target = Math.max(target, col * em.CONFIG.cell + r);
              break outer;
            }
          }
        }
      }

      p.x = target;
      return;
    }

    const left = Math.floor((p.x - r + 2) / em.CONFIG.cell);
    const right = Math.floor((p.x + r - 2) / em.CONFIG.cell);

    if (amount > 0) {
      const startRow = Math.floor((p.y + r - edgeEpsilon) / em.CONFIG.cell);
      const endRow = Math.floor((target + r - edgeEpsilon) / em.CONFIG.cell);

      outer:
      for (let row = startRow; row <= endRow; row++) {
        for (let col = left; col <= right; col++) {
          if (em.isBlockedBetween(state, col, row, col, row + 1)) {
            target = Math.min(target, (row + 1) * em.CONFIG.cell - r);
            break outer;
          }
        }
      }
    } else {
      const startRow = Math.floor((p.y - r + edgeEpsilon) / em.CONFIG.cell);
      const endRow = Math.floor((target - r + edgeEpsilon) / em.CONFIG.cell);

      outer:
      for (let row = startRow; row >= endRow; row--) {
        for (let col = left; col <= right; col++) {
          if (em.isBlockedBetween(state, col, row, col, row - 1)) {
            target = Math.max(target, row * em.CONFIG.cell + r);
            break outer;
          }
        }
      }
    }

    p.y = target;
  }

  function addCrumb(state, dt, input) {
    state.crumbClock -= dt;

    if (state.crumbClock <= 0 && (input.x !== 0 || input.y !== 0)) {
      state.crumbClock = 0.18;
      state.crumbs.push({
        x: state.player.x,
        y: state.player.y,
        angle: state.player.angle,
        ttl: em.CONFIG.memoryTrailTtl,
        maxTtl: em.CONFIG.memoryTrailTtl
      });
      if (state.crumbs.length > 260) state.crumbs.shift();
    }

    for (const c of state.crumbs) c.ttl -= dt;
    state.crumbs = state.crumbs.filter(c => c.ttl > 0);
  }

  function updateCamera(state, dt) {
    const follow = 1 - Math.pow(0.001, dt);
    state.camera.x += (state.player.x - state.camera.x) * follow;
    state.camera.y += (state.player.y - state.camera.y) * follow;
  }

  function distanceToPlayerCell(state, x, y) {
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    return Math.hypot(x - pc.x, y - pc.y);
  }

  function isLitCell(state, x, y) {
    return distanceToPlayerCell(state, x, y) <= state.player.vision;
  }

  function effectivePlayerSpeed(state) {
    const p = state.player;
    const boost = p.speedBoostTimer > 0 ? (p.speedBoostMultiplier || em.CONFIG.upgrades.quickstepOverflowMultiplier) : 1;
    return Math.min(em.CONFIG.playerCaps.maxBoostedSpeed, p.speed * boost);
  }

  function compassLensCount(state) {
    const maxCompass = em.CONFIG.playerCaps.maxCompass;
    return Math.max(0, Math.min(maxCompass, state.player.compass || 0));
  }

  function anchorSignalInfo(state, obj = null) {
    const target = obj || (em.closestActiveAnchor ? em.closestActiveAnchor(state) : state.objective);
    const lenses = compassLensCount(state);
    const maxCompass = em.CONFIG.playerCaps.maxCompass;
    const info = {
      detectable: false,
      lenses,
      maxCompass,
      rangeChunks: lenses,
      distanceCells: Infinity,
      distanceChunks: Infinity,
      always: lenses >= maxCompass
    };

    if (!target || target.type !== 'anchor') return info;

    const pc = em.cellOfWorld(state.player.x, state.player.y);
    info.distanceCells = Math.hypot(target.x - pc.x, target.y - pc.y);
    info.distanceChunks = info.distanceCells / em.CONFIG.chunk;
    info.detectable = lenses > 0 && (info.always || info.distanceChunks <= lenses);
    return info;
  }

  function isAnchorSignalDetected(state, obj = null) {
    return anchorSignalInfo(state, obj).detectable;
  }

  function isKnownSignal(state, obj) {
    if (!obj) return false;
    if (obj.type === 'anchor') return state.revealed.has(em.keyOf(obj.x, obj.y));

    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const dist = Math.hypot(obj.x - pc.x, obj.y - pc.y);
    return state.revealed.has(em.keyOf(obj.x, obj.y)) || dist <= 7 + state.player.compass * 5 + state.player.compassObjective * 8;
  }

  function updateNoExitVoid(state) {
    if (!state || state.gameMode !== 'noExit' || !state.void) return false;

    const cfg = em.CONFIG.noExit;
    if (state.time < cfg.voidDelay) return false;

    if (!state.void.active) {
      state.void.active = true;
      state.void.startedAt = state.time;
      em.addMessage(state, 'The void opens at the start. Run outward.');
    }

    const elapsed = Math.max(0, state.time - cfg.voidDelay);
    const acceleration = cfg.voidGrowthPerMinute / 60;
    const radiusCells = cfg.voidStartRadiusCells +
      cfg.voidBaseGrowthCellsPerSecond * elapsed +
      0.5 * acceleration * elapsed * elapsed;

    state.void.radius = radiusCells * em.CONFIG.cell;
    if (em.ensureNoExitAnchors) em.ensureNoExitAnchors(state);

    if (Math.hypot(state.player.x - state.void.x, state.player.y - state.void.y) <= state.void.radius) {
      em.endRun(state, 'gameover', 'you were lost to the void');
      return true;
    }

    return false;
  }

  function update(state, dt, input = { x: 0, y: 0 }) {
    if (state.mode !== 'playing') {
      em.tickMessages(state, dt);
      em.tickVisuals(state, dt);
      return;
    }

    state.time += dt;
    state.anchorClock += dt;
    em.tickMessages(state, dt);
    em.tickDangerWarning(state, dt);
    em.updateVisionAndDanger(state, dt);

    state.player.speedBoostTimer = Math.max(0, (state.player.speedBoostTimer || 0) - dt);
    if (state.player.speedBoostTimer <= 0) state.player.speedBoostMultiplier = 1;

    const speed = em.effectivePlayerSpeed(state);
    em.movePlayer(state, input.x * speed * dt, input.y * speed * dt);
    if (em.updateNoExitVoid(state)) return;

    if (state.player.phaseTimer > 0) {
      state.player.phaseTimer = Math.max(0, state.player.phaseTimer - dt);
      state.phaseTrailClock -= dt;
      if (state.phaseTrailClock <= 0) {
        state.phaseTrailClock = 0.08;
        em.addParticles(state, state.player.x, state.player.y, '#bd8cff', 2 + (state.upgrades.phaseDuration || 0));
      }
    }

    const pc = em.cellOfWorld(state.player.x, state.player.y);
    em.revealAround(state, pc.x, pc.y, state.player.vision);
    em.collectNearbyItems(state);
    em.checkObjective(state, pc);
    em.updateWarden(state, dt, pc);
    em.updateEnemies(state, dt, pc);

    state.maxDepth = Math.max(state.maxDepth, Math.abs(pc.x) + Math.abs(pc.y));
    em.addCrumb(state, dt, input);
    state.ambientClock -= dt;
    if (state.ambientClock <= 0) {
      state.ambientClock = 0.24;
      em.addAmbientMote(state);
    }
    em.updateCamera(state, dt);
    em.tickVisuals(state, dt);

    if (state.player.health <= 0) {
      em.endRun(state, 'gameover', 'The Warden shattered your echo.');
    }
  }

  Object.assign(em, {
    activatePhase,
    usePhase,
    movePlayer,
    effectivePlayerSpeed,
    moveAxis,
    addCrumb,
    updateCamera,
    distanceToPlayerCell,
    isLitCell,
    compassLensCount,
    anchorSignalInfo,
    isAnchorSignalDetected,
    isKnownSignal,
    updateNoExitVoid,
    update
  });

  window.EchoMaze = em;
})();
