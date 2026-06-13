(function () {
  'use strict';

  const em = window.EchoMaze || {};

  em.BIOMES = [
    {
      id: 'stone',
      label: 'Stone Maze',
      floor: [18, 34, 45],
      darkFloor: [8, 13, 18],
      wall: [140, 210, 230],
      accent: '#7df9ff',
      loopBonus: 0,
      roomChance: 0.34,
      moteRate: 0.10
    },
    {
      id: 'fungal',
      label: 'Fungal Maze',
      floor: [27, 38, 34],
      darkFloor: [9, 16, 14],
      wall: [145, 220, 166],
      accent: '#8ef7a2',
      loopBonus: 0.012,
      roomChance: 0.46,
      moteRate: 0.18
    },
    {
      id: 'crystal',
      label: 'Crystal Maze',
      floor: [23, 31, 55],
      darkFloor: [7, 10, 23],
      wall: [174, 142, 255],
      accent: '#bd8cff',
      loopBonus: 0.006,
      roomChance: 0.30,
      moteRate: 0.20
    },
    {
      id: 'void',
      label: 'Void Maze',
      floor: [18, 20, 36],
      darkFloor: [4, 5, 12],
      wall: [255, 111, 157],
      accent: '#ff6f9d',
      loopBonus: -0.010,
      roomChance: 0.24,
      moteRate: 0.08
    },
    {
      id: 'library',
      label: 'Ancient Library',
      floor: [39, 31, 27],
      darkFloor: [15, 10, 8],
      wall: [255, 184, 108],
      accent: '#ffb86c',
      loopBonus: 0.002,
      roomChance: 0.56,
      moteRate: 0.13
    },
    {
      id: 'flooded',
      label: 'Flooded Maze',
      floor: [17, 42, 53],
      darkFloor: [5, 15, 19],
      wall: [138, 184, 255],
      accent: '#8ab8ff',
      loopBonus: 0.018,
      roomChance: 0.38,
      moteRate: 0.16
    }
  ];

  function biomeForChunk(state, cx, cy) {
    if (cx === 0 && cy === 0) return em.BIOMES[0];
    const index = em.hash32(state, cx, cy, 12121) % em.BIOMES.length;
    return em.BIOMES[index];
  }

  function biomeForCell(state, x, y) {
    const c = em.cellToChunk(x, y);
    return biomeForChunk(state, c.cx, c.cy);
  }

  function biomeAccentForWorld(state, x, y) {
    const cell = em.cellOfWorld(x, y);
    return biomeForCell(state, cell.x, cell.y).accent;
  }

  function rgbaFrom(rgb, alpha) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }

  Object.assign(em, { biomeForChunk, biomeForCell, biomeAccentForWorld, rgbaFrom });
  window.EchoMaze = em;
})();
