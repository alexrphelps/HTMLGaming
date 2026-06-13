(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function floorDiv(n, d) {
    return Math.floor(n / d);
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function keyOf(x, y) {
    return x + ',' + y;
  }

  function parseKey(key) {
    const parts = key.split(',');
    return { x: Number(parts[0]), y: Number(parts[1]) };
  }

  function cellOfWorld(x, y) {
    return {
      x: Math.floor(x / em.CONFIG.cell),
      y: Math.floor(y / em.CONFIG.cell)
    };
  }

  function cellToChunk(x, y) {
    return {
      cx: floorDiv(x, em.CONFIG.chunk),
      cy: floorDiv(y, em.CONFIG.chunk),
      lx: mod(x, em.CONFIG.chunk),
      ly: mod(y, em.CONFIG.chunk)
    };
  }

  function indexOf(lx, ly) {
    return ly * em.CONFIG.chunk + lx;
  }

  function chunkKey(cx, cy) {
    return cx + ',' + cy;
  }

  Object.assign(em, {
    floorDiv,
    mod,
    keyOf,
    parseKey,
    cellOfWorld,
    cellToChunk,
    indexOf,
    chunkKey
  });

  window.EchoMaze = em;
})();
