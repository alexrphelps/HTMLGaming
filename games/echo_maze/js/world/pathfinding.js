(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function findReachableCell(state, start, preferredDistance) {
    const queue = [{ x: start.x, y: start.y, d: 0 }];
    const seen = new Set([em.keyOf(start.x, start.y)]);
    let best = { x: start.x, y: start.y, distance: 0, score: Infinity };

    while (queue.length && seen.size < em.CONFIG.pathLimit) {
      const cur = queue.shift();
      const dist = Math.abs(cur.x - start.x) + Math.abs(cur.y - start.y);
      const score = Math.abs(dist - preferredDistance) - dist * 0.02 + em.rand01(state, cur.x, cur.y, 7700) * 0.2;

      if (dist > 8 && score < best.score) {
        best = { x: cur.x, y: cur.y, distance: cur.d, score };
      }

      for (const dir of em.DIRS) {
        const nx = cur.x + em.VEC[dir].x;
        const ny = cur.y + em.VEC[dir].y;
        const key = em.keyOf(nx, ny);
        if (seen.has(key) || em.isBlockedBetween(state, cur.x, cur.y, nx, ny)) continue;
        seen.add(key);
        queue.push({ x: nx, y: ny, d: cur.d + 1 });
      }
    }

    return best;
  }

  function findPath(state, start, goal, limit) {
    const startKey = em.keyOf(start.x, start.y);
    const goalKey = em.keyOf(goal.x, goal.y);
    const queue = [{ x: start.x, y: start.y }];
    const cameFrom = new Map([[startKey, null]]);

    while (queue.length && cameFrom.size < limit) {
      const cur = queue.shift();
      const curKey = em.keyOf(cur.x, cur.y);
      if (curKey === goalKey) break;

      for (const dir of em.DIRS) {
        const nx = cur.x + em.VEC[dir].x;
        const ny = cur.y + em.VEC[dir].y;
        const key = em.keyOf(nx, ny);
        if (cameFrom.has(key) || em.isBlockedBetween(state, cur.x, cur.y, nx, ny)) continue;

        cameFrom.set(key, curKey);
        queue.push({ x: nx, y: ny });
      }
    }

    if (!cameFrom.has(goalKey)) return null;

    const path = [];
    let cur = goalKey;

    while (cur) {
      path.push(em.parseKey(cur));
      cur = cameFrom.get(cur);
    }

    path.reverse();
    return path;
  }

  function fallbackWardenStep(state, start, goal) {
    const options = [];

    for (const dir of em.DIRS) {
      const nx = start.x + em.VEC[dir].x;
      const ny = start.y + em.VEC[dir].y;
      if (em.isBlockedBetween(state, start.x, start.y, nx, ny)) continue;

      options.push({
        x: nx,
        y: ny,
        score: Math.hypot(goal.x - nx, goal.y - ny) + em.rand01(state, nx, ny, 9901) * 0.25
      });
    }

    options.sort((a, b) => a.score - b.score);
    return options.length ? [start, options[0]] : [start];
  }

  Object.assign(em, { findReachableCell, findPath, fallbackWardenStep });
  window.EchoMaze = em;
})();
