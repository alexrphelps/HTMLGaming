(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function objectiveRadius(x, y) {
    return Math.hypot(x, y);
  }

  function makeObjective(state, tier) {
    const objectives = makeObjectives(state, tier);
    return objectives[0] || null;
  }

  function activeAnchorCountForTier(tier) {
    const cfg = em.CONFIG.anchors;
    const min = cfg.activeCountMin || cfg.activeCount || 1;
    const max = cfg.activeCountMax || min;
    const step = Math.max(1, cfg.activeCountTierStep || 1);
    return Math.max(1, Math.min(max, min + Math.floor(Math.max(0, tier) / step)));
  }

  function makeObjectives(state, tier) {
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const previousRadius = state.lastAnchorRadius || 0;
    const cfg = em.CONFIG.anchors;
    const minRadius = Math.max(previousRadius + cfg.minOutwardStep, cfg.firstRadius + (tier - 1) * cfg.radiusStep, noExitMinimumAnchorRadius(state));
    const candidates = [];

    for (let ring = 0; ring < cfg.searchRings; ring++) {
      const targetRadius = minRadius + ring * cfg.minOutwardStep;

      for (let i = 0; i < cfg.candidateCount; i++) {
        const candidateIndex = ring * cfg.candidateCount + i;
        const angle = em.rand01(state, tier, candidateIndex, 7000) * Math.PI * 2;
        const jitter = Math.floor((em.rand01(state, tier, candidateIndex, 7001) - 0.5) * cfg.radiusJitter * 2);
        const radius = Math.max(minRadius, targetRadius + jitter);
        const x = Math.round(Math.cos(angle) * radius);
        const y = Math.round(Math.sin(angle) * radius);
        const originRadius = objectiveRadius(x, y);

        if (originRadius <= previousRadius) continue;

        const path = em.findPath(state, pc, { x, y }, em.CONFIG.pathLimit);

        if (path) {
          const pathTarget = Math.max(18, targetRadius * 0.65);
          const score = Math.abs(originRadius - minRadius) * 0.85 +
            Math.abs(path.length - pathTarget) * 0.18 +
            em.rand01(state, x, y, 7002) * 3;
          candidates.push({ x, y, score, pathLength: path.length, originRadius });
        }
      }

      if (candidates.length) break;
    }

    if (!candidates.length) {
      const fallback = em.findReachableCell(state, pc, minRadius);
      const radius = Math.max(minRadius, objectiveRadius(fallback.x, fallback.y));
      candidates.push({ x: fallback.x, y: fallback.y, score: 999, pathLength: fallback.distance, originRadius: radius });
    }

    candidates.sort((a, b) => a.score - b.score);
    const selected = selectAnchorBatch(candidates, activeAnchorCountForTier(tier), cfg.spread || cfg.minOutwardStep);
    const best = selected[0];
    state.lastAnchorRadius = Math.max(previousRadius, best.originRadius);
    state.anchorMinRadius = minRadius;

    return selected.map((entry, index) => ({
      type: 'anchor',
      x: entry.x,
      y: entry.y,
      tier,
      pathLength: entry.pathLength,
      originRadius: entry.originRadius,
      name: 'Echo Anchor ' + tier + (index > 0 ? ' ' + String.fromCharCode(65 + index) : ''),
      baseReward: 475 + tier * 185,
      createdAt: state.time
    }));
  }

  function selectAnchorBatch(candidates, count, minSpread) {
    const selected = [];

    for (const candidate of candidates) {
      const tooClose = selected.some(existing => Math.hypot(candidate.x - existing.x, candidate.y - existing.y) < minSpread);
      if (tooClose) continue;
      selected.push(candidate);
      if (selected.length >= count) break;
    }

    if (!selected.length && candidates.length) selected.push(candidates[0]);
    return selected;
  }

  function activeAnchors(state) {
    if (!state) return [];
    if (state.objectives && state.objectives.length) return state.objectives.filter(obj => obj && obj.type === 'anchor' && !isAnchorCoveredByVoid(state, obj));
    return state.objective && state.objective.type === 'anchor' && !isAnchorCoveredByVoid(state, state.objective) ? [state.objective] : [];
  }

  function closestActiveAnchor(state) {
    const anchors = activeAnchors(state);
    if (!anchors.length) return null;
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    return anchors.reduce((closest, obj) => {
      const dist = Math.hypot(obj.x - pc.x, obj.y - pc.y);
      return !closest || dist < closest.dist ? { obj, dist } : closest;
    }, null).obj;
  }

  function makeExitPortal(state) {
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const targetDistance = 28 + state.tier * 8;
    const cell = em.findReachableCell(state, pc, targetDistance);

    return {
      type: 'exit',
      x: cell.x,
      y: cell.y,
      name: 'Exit Portal',
      createdAt: state.time
    };
  }

  function noExitMinimumAnchorRadius(state) {
    if (!state || state.gameMode !== 'noExit' || !state.void) return 0;
    const voidRadiusCells = (state.void.radius || 0) / em.CONFIG.cell;
    return voidRadiusCells + (em.CONFIG.anchors.minOutwardStep || 8);
  }

  function isAnchorCoveredByVoid(state, obj) {
    if (!state || state.gameMode !== 'noExit' || !state.void || !state.void.active || !obj) return false;
    const wx = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    const wy = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    return Math.hypot(wx - state.void.x, wy - state.void.y) <= state.void.radius;
  }

  function pruneVoidCoveredAnchors(state) {
    if (!state || state.gameMode !== 'noExit' || !state.void || !state.void.active) return 0;

    const before = state.objectives ? state.objectives.length : 0;
    state.objectives = (state.objectives || []).filter(obj => obj && obj.type === 'anchor' && !isAnchorCoveredByVoid(state, obj));
    state.objective = state.objective && !isAnchorCoveredByVoid(state, state.objective) ? state.objective : null;

    if (state.objective && !state.objectives.includes(state.objective)) {
      state.objectives.unshift(state.objective);
    }

    return before - state.objectives.length;
  }

  function ensureNoExitAnchors(state) {
    if (!state || state.gameMode !== 'noExit' || state.pendingAnchorAdvance) return;

    pruneVoidCoveredAnchors(state);
    const desired = activeAnchorCountForTier(state.tier);
    if (activeAnchors(state).length >= desired) {
      state.objective = closestActiveAnchor(state);
      return;
    }

    const needed = desired - activeAnchors(state).length;
    const fresh = em.makeObjectives ? em.makeObjectives(state, state.tier) : [];
    const existingKeys = new Set((state.objectives || []).map(obj => em.keyOf(obj.x, obj.y)));

    for (const obj of fresh) {
      if (state.objectives.length >= desired) break;
      const key = em.keyOf(obj.x, obj.y);
      if (existingKeys.has(key) || isAnchorCoveredByVoid(state, obj)) continue;
      state.objectives.push(obj);
      existingKeys.add(key);
    }

    if (state.objectives.length < desired && fresh.length > needed) {
      for (const obj of fresh) {
        if (state.objectives.length >= desired) break;
        if (!isAnchorCoveredByVoid(state, obj)) state.objectives.push(obj);
      }
    }

    state.objective = closestActiveAnchor(state);
  }

  Object.assign(em, {
    objectiveRadius,
    activeAnchorCountForTier,
    makeObjective,
    makeObjectives,
    selectAnchorBatch,
    activeAnchors,
    closestActiveAnchor,
    noExitMinimumAnchorRadius,
    isAnchorCoveredByVoid,
    pruneVoidCoveredAnchors,
    ensureNoExitAnchors,
    makeExitPortal
  });
  window.EchoMaze = em;
})();
