(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function generateChunk(state, cx, cy) {
    const cells = [];
    const visited = new Array(em.CONFIG.chunk * em.CONFIG.chunk).fill(false);
    const biome = em.biomeForChunk ? em.biomeForChunk(state, cx, cy) : null;

    for (let i = 0; i < em.CONFIG.chunk * em.CONFIG.chunk; i++) {
      cells.push({ N: true, E: true, S: true, W: true });
    }

    const start = {
      x: em.hash32(state, cx, cy, 1101) % em.CONFIG.chunk,
      y: em.hash32(state, cx, cy, 1102) % em.CONFIG.chunk
    };
    const stack = [start];
    visited[em.indexOf(start.x, start.y)] = true;

    while (stack.length) {
      const cur = stack[stack.length - 1];
      const candidates = [];

      for (const dir of em.DIRS) {
        const nx = cur.x + em.VEC[dir].x;
        const ny = cur.y + em.VEC[dir].y;

        if (nx < 0 || ny < 0 || nx >= em.CONFIG.chunk || ny >= em.CONFIG.chunk) continue;
        if (!visited[em.indexOf(nx, ny)]) candidates.push({ x: nx, y: ny, dir });
      }

      if (!candidates.length) {
        stack.pop();
        continue;
      }

      candidates.sort((a, b) => {
        const av = em.hash32(state, cx * em.CONFIG.chunk + a.x, cy * em.CONFIG.chunk + a.y, 2200 + stack.length);
        const bv = em.hash32(state, cx * em.CONFIG.chunk + b.x, cy * em.CONFIG.chunk + b.y, 2200 + stack.length);
        return av - bv;
      });

      const next = candidates[0];
      em.openLocal(cells, cur.x, cur.y, next.dir);
      em.openLocal(cells, next.x, next.y, em.OPP[next.dir]);
      visited[em.indexOf(next.x, next.y)] = true;
      stack.push({ x: next.x, y: next.y });
    }

    addExtraLoops(state, cells, cx, cy, biome);
    carveRooms(state, cells, cx, cy, biome);
    openChunkPortals(state, cells, cx, cy);
    carveSpawnCells(cells, cx, cy);

    return { cells, biomeId: biome ? biome.id : 'stone' };
  }

  function addExtraLoops(state, cells, cx, cy, biome) {
    for (let ly = 0; ly < em.CONFIG.chunk; ly++) {
      for (let lx = 0; lx < em.CONFIG.chunk; lx++) {
        const gx = cx * em.CONFIG.chunk + lx;
        const gy = cy * em.CONFIG.chunk + ly;
        const loopRate = Math.max(0.018, 0.043 + (em.rand01(state, cx, cy, 3100) * 0.018) + (biome ? biome.loopBonus : 0));

        if (lx < em.CONFIG.chunk - 1 && em.rand01(state, gx, gy, 3101) < loopRate) {
          em.openLocal(cells, lx, ly, 'E');
          em.openLocal(cells, lx + 1, ly, 'W');
        }

        if (ly < em.CONFIG.chunk - 1 && em.rand01(state, gx, gy, 3102) < loopRate) {
          em.openLocal(cells, lx, ly, 'S');
          em.openLocal(cells, lx, ly + 1, 'N');
        }
      }
    }
  }

  function carveRooms(state, cells, cx, cy, biome) {
    if (em.rand01(state, cx, cy, 3300) > (biome ? biome.roomChance : 0.34)) return;

    const w = 2 + (em.hash32(state, cx, cy, 3301) % 3);
    const h = 2 + (em.hash32(state, cx, cy, 3302) % 3);
    const x0 = 1 + (em.hash32(state, cx, cy, 3303) % (em.CONFIG.chunk - w - 1));
    const y0 = 1 + (em.hash32(state, cx, cy, 3304) % (em.CONFIG.chunk - h - 1));

    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (x < x0 + w - 1) {
          em.openLocal(cells, x, y, 'E');
          em.openLocal(cells, x + 1, y, 'W');
        }

        if (y < y0 + h - 1) {
          em.openLocal(cells, x, y, 'S');
          em.openLocal(cells, x, y + 1, 'N');
        }
      }
    }
  }

  function portalPositionsForEdge(state, cx, cy, dir) {
    let ex = cx;
    let ey = cy;
    let salt = 0;

    if (dir === 'N') { ex = cx; ey = cy; salt = 4100; }
    if (dir === 'S') { ex = cx; ey = cy + 1; salt = 4100; }
    if (dir === 'W') { ex = cx; ey = cy; salt = 4200; }
    if (dir === 'E') { ex = cx + 1; ey = cy; salt = 4200; }

    const positions = new Set();
    positions.add(1 + (em.hash32(state, ex, ey, salt + 1) % (em.CONFIG.chunk - 2)));
    positions.add(1 + (em.hash32(state, ex, ey, salt + 2) % (em.CONFIG.chunk - 2)));

    if (em.hash32(state, ex, ey, salt + 3) % 100 < 44) {
      positions.add(1 + (em.hash32(state, ex, ey, salt + 4) % (em.CONFIG.chunk - 2)));
    }

    return [...positions];
  }

  function openChunkPortals(state, cells, cx, cy) {
    for (const lx of portalPositionsForEdge(state, cx, cy, 'N')) em.openLocal(cells, lx, 0, 'N');
    for (const lx of portalPositionsForEdge(state, cx, cy, 'S')) em.openLocal(cells, lx, em.CONFIG.chunk - 1, 'S');
    for (const ly of portalPositionsForEdge(state, cx, cy, 'W')) em.openLocal(cells, 0, ly, 'W');
    for (const ly of portalPositionsForEdge(state, cx, cy, 'E')) em.openLocal(cells, em.CONFIG.chunk - 1, ly, 'E');
  }

  function carveSpawnCells(cells, cx, cy) {
    const spawnCells = new Set();

    for (let y = -1; y <= 1; y++) {
      for (let x = -1; x <= 1; x++) spawnCells.add(em.keyOf(x, y));
    }

    for (const key of spawnCells) {
      const pos = em.parseKey(key);
      const c = em.cellToChunk(pos.x, pos.y);
      if (c.cx !== cx || c.cy !== cy) continue;

      for (const dir of em.DIRS) {
        const nx = pos.x + em.VEC[dir].x;
        const ny = pos.y + em.VEC[dir].y;
        if (!spawnCells.has(em.keyOf(nx, ny))) continue;
        em.openLocal(cells, c.lx, c.ly, dir);
      }
    }
  }

  Object.assign(em, {
    generateChunk,
    addExtraLoops,
    carveRooms,
    portalPositionsForEdge,
    openChunkPortals,
    carveSpawnCells
  });

  window.EchoMaze = em;
})();
