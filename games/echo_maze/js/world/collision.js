(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function directionBetween(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;

    if (dx === 1 && dy === 0) return 'E';
    if (dx === -1 && dy === 0) return 'W';
    if (dx === 0 && dy === 1) return 'S';
    if (dx === 0 && dy === -1) return 'N';
    return null;
  }

  function isBlockedBetween(state, ax, ay, bx, by) {
    const dir = directionBetween(ax, ay, bx, by);
    if (!dir) return true;
    return em.localWall(state, ax, ay, dir) || em.localWall(state, bx, by, em.OPP[dir]);
  }

  Object.assign(em, { directionBetween, isBlockedBetween });
  window.EchoMaze = em;
})();
