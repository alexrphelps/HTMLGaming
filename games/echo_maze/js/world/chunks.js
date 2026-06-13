(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function openLocal(cells, lx, ly, dir) {
    if (lx < 0 || ly < 0 || lx >= em.CONFIG.chunk || ly >= em.CONFIG.chunk) return;
    cells[em.indexOf(lx, ly)][dir] = false;
  }

  function getChunk(state, cx, cy) {
    const key = em.chunkKey(cx, cy);

    if (!state.chunkCache.has(key)) {
      state.chunkCache.set(key, em.generateChunk(state, cx, cy));
    }

    return state.chunkCache.get(key);
  }

  function localWall(state, gx, gy, dir) {
    const c = em.cellToChunk(gx, gy);
    const chunk = getChunk(state, c.cx, c.cy);
    return chunk.cells[em.indexOf(c.lx, c.ly)][dir];
  }

  function ensureSpawnRoom(state) {
    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) {
        const c = em.cellToChunk(x, y);
        getChunk(state, c.cx, c.cy);
      }
    }
  }

  Object.assign(em, {
    openLocal,
    getChunk,
    localWall,
    ensureSpawnRoom
  });

  window.EchoMaze = em;
})();
