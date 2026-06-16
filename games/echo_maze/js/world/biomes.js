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
      wall: [166, 148, 230],
      accent: '#a694ff',
      loopBonus: -0.010,
      roomChance: 0.24,
      moteRate: 0.08
    },
    {
      id: 'library',
      label: 'Ancient Library',
      floor: [39, 31, 27],
      darkFloor: [15, 10, 8],
      wall: [196, 205, 126],
      accent: '#c8f26a',
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

  em.DANGER_PALETTES = [
    {
      label: 'Quiet',
      floor: [18, 34, 45],
      darkFloor: [8, 13, 18],
      wall: [140, 210, 230],
      accent: '#7df9ff'
    },
    {
      label: 'Uneasy',
      floor: [25, 39, 43],
      darkFloor: [9, 15, 17],
      wall: [156, 218, 196],
      accent: '#8ef7a2'
    },
    {
      label: 'Waking',
      floor: [43, 38, 31],
      darkFloor: [18, 13, 9],
      wall: [214, 190, 116],
      accent: '#ffe27a'
    },
    {
      label: 'Hostile',
      floor: [52, 31, 24],
      darkFloor: [20, 8, 6],
      wall: [255, 159, 28],
      accent: '#ff9f1c'
    },
    {
      label: 'Critical',
      floor: [55, 22, 27],
      darkFloor: [18, 4, 7],
      wall: [255, 78, 56],
      accent: '#ff4e38'
    }
  ];

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function depthForCell(x, y) {
    return Math.hypot(x, y);
  }

  function dangerForDepth(depth) {
    const cfg = em.CONFIG.danger;
    return clamp01((depth - cfg.startSafeRadius) / Math.max(1, cfg.fullDepthRadius - cfg.startSafeRadius));
  }

  function dangerForCell(x, y) {
    return dangerForDepth(depthForCell(x, y));
  }

  function dangerForChunk(cx, cy) {
    const mid = em.CONFIG.chunk / 2;
    return dangerForCell(cx * em.CONFIG.chunk + mid, cy * em.CONFIG.chunk + mid);
  }

  function dangerBandForDanger(danger) {
    return Math.max(0, Math.min(em.DANGER_PALETTES.length - 1, Math.floor(clamp01(danger) * em.DANGER_PALETTES.length)));
  }

  function dangerBandForChunk(cx, cy) {
    return dangerBandForDanger(dangerForChunk(cx, cy));
  }

  function biomeForChunk(state, cx, cy) {
    if (state && state.gameMode === 'beginner') return em.BIOMES[0];
    if (cx === 0 && cy === 0) return em.BIOMES[0];
    const index = em.hash32(state, cx, cy, 12121) % em.BIOMES.length;
    const base = em.BIOMES[index];
    const danger = dangerForChunk(cx, cy);
    const dangerBand = dangerBandForDanger(danger);
    const palette = em.DANGER_PALETTES[dangerBand];

    return Object.assign({}, base, {
      floor: palette.floor,
      darkFloor: palette.darkFloor,
      wall: palette.wall,
      accent: palette.accent,
      danger,
      dangerBand,
      dangerLabel: palette.label
    });
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
  Object.assign(em, {
    depthForCell,
    dangerForDepth,
    dangerForCell,
    dangerForChunk,
    dangerBandForDanger,
    dangerBandForChunk
  });
  window.EchoMaze = em;
})();
