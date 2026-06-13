(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function makeObjective(state, tier) {
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const origin = state.objective || pc;
    const baseDistance = 18 + tier * 13;
    const candidates = [];

    for (let i = 0; i < 72; i++) {
      const angle = em.rand01(state, tier, i, 7000) * Math.PI * 2;
      const jitter = Math.floor((em.rand01(state, tier, i, 7001) - 0.5) * 12);
      const x = Math.round(origin.x + Math.cos(angle) * (baseDistance + jitter));
      const y = Math.round(origin.y + Math.sin(angle) * (baseDistance + jitter));
      const fromPlayer = Math.abs(x - pc.x) + Math.abs(y - pc.y);
      const path = em.findPath(state, pc, { x, y }, em.CONFIG.pathLimit);

      if (path) {
        const score = Math.abs(fromPlayer - baseDistance * 1.15) + em.rand01(state, x, y, 7002) * 3;
        candidates.push({ x, y, score, pathLength: path.length });
      }
    }

    if (!candidates.length) {
      const fallback = em.findReachableCell(state, pc, baseDistance);
      candidates.push({ x: fallback.x, y: fallback.y, score: 999, pathLength: fallback.distance });
    }

    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0];

    return {
      type: 'anchor',
      x: best.x,
      y: best.y,
      tier,
      pathLength: best.pathLength,
      name: 'Echo Anchor ' + tier,
      baseReward: 475 + tier * 185,
      createdAt: state.time
    };
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

  Object.assign(em, { makeObjective, makeExitPortal });
  window.EchoMaze = em;
})();
