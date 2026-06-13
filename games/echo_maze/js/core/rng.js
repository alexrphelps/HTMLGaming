(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function hash32(state, x, y, salt = 0) {
    let h = state.seed | 0;
    h ^= Math.imul(x | 0, 374761393);
    h ^= Math.imul(y | 0, 668265263);
    h ^= Math.imul(salt | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function rand01(state, x, y, salt = 0) {
    return hash32(state, x, y, salt) / 4294967295;
  }

  Object.assign(em, { hash32, rand01 });
  window.EchoMaze = em;
})();
