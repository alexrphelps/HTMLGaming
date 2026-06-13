(function () {
  'use strict';

  const em = window.EchoMaze || {};

  em.CONFIG = {
    cell: 63,
    chunk: 12,
    runAnchors: 5,
    baseItemRate: 0.032,
    maxDpr: 2,
    baseVision: 3,
    baseSpeed: 150,
    playerRadius: 9,
    phaseDuration: 2.8,
    minimapBase: 368,
    minimapRange: 38,
    pathLimit: 6200,
    wardenStartDelay: 6,
    wardenDamageCooldown: 1.4
  };

  em.DIRS = ['N', 'E', 'S', 'W'];
  em.OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  em.VEC = {
    N: { x: 0, y: -1 },
    S: { x: 0, y: 1 },
    E: { x: 1, y: 0 },
    W: { x: -1, y: 0 }
  };

  window.EchoMaze = em;
})();
