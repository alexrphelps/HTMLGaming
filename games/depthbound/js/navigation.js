(function(D) {
  with (D) {
  const NAV_RADIUS = 18;
  const DOOR_HALF = 74;
  const LANE_HALF = 58;

  function expandedRect(rect, pad = 0) {
    return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function pointInRect(x, y, rect, pad = 0) {
    return x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;
  }

  function circleHitsRect(cx, cy, cr, rect) {
    const nx = clamp(cx, rect.x, rect.x + rect.w);
    const ny = clamp(cy, rect.y, rect.y + rect.h);
    return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= cr * cr;
  }

  function doorCenter(dir) {
    if (dir === "N") return { x: ROOM_W / 2, y: 34 };
    if (dir === "S") return { x: ROOM_W / 2, y: ROOM_H - 34 };
    if (dir === "E") return { x: ROOM_W - 34, y: ROOM_H / 2 };
    return { x: 34, y: ROOM_H / 2 };
  }

  function getDoorSpawnPoint(dir) {
    if (dir === "N") return { x: ROOM_W / 2, y: 74 };
    if (dir === "S") return { x: ROOM_W / 2, y: ROOM_H - 74 };
    if (dir === "E") return { x: ROOM_W - 74, y: ROOM_H / 2 };
    if (dir === "W") return { x: 74, y: ROOM_H / 2 };
    return { x: ROOM_W / 2, y: ROOM_H / 2 };
  }

  function buildRoomDoorZones(exits) {
    return DIRS.map(d => {
      const open = exits.includes(d.name);
      const center = doorCenter(d.name);
      let rect;
      if (d.name === "N") rect = { x: ROOM_W / 2 - DOOR_HALF, y: 0, w: DOOR_HALF * 2, h: 58 };
      if (d.name === "S") rect = { x: ROOM_W / 2 - DOOR_HALF, y: ROOM_H - 58, w: DOOR_HALF * 2, h: 58 };
      if (d.name === "E") rect = { x: ROOM_W - 58, y: ROOM_H / 2 - DOOR_HALF, w: 58, h: DOOR_HALF * 2 };
      if (d.name === "W") rect = { x: 0, y: ROOM_H / 2 - DOOR_HALF, w: 58, h: DOOR_HALF * 2 };
      return { dir: d.name, open, center, rect, transition: expandedRect(rect, 10) };
    });
  }

  function buildRoomReservedLanes(exits) {
    const lanes = [
      { kind: "center", x: ROOM_W / 2 - 100, y: ROOM_H / 2 - 100, w: 200, h: 200 }
    ];
    for (const dir of exits) {
      if (dir === "N") lanes.push({ kind: "lane", dir, x: ROOM_W / 2 - LANE_HALF, y: 0, w: LANE_HALF * 2, h: ROOM_H / 2 + 96 });
      if (dir === "S") lanes.push({ kind: "lane", dir, x: ROOM_W / 2 - LANE_HALF, y: ROOM_H / 2 - 96, w: LANE_HALF * 2, h: ROOM_H / 2 + 96 });
      if (dir === "E") lanes.push({ kind: "lane", dir, x: ROOM_W / 2 - 96, y: ROOM_H / 2 - LANE_HALF, w: ROOM_W / 2 + 96, h: LANE_HALF * 2 });
      if (dir === "W") lanes.push({ kind: "lane", dir, x: 0, y: ROOM_H / 2 - LANE_HALF, w: ROOM_W / 2 + 96, h: LANE_HALF * 2 });
    }
    return lanes;
  }

  function rectTouchesReserved(rect, lanes, pad = 10) {
    return lanes.some(lane => rectsOverlap(expandedRect(rect, pad), lane));
  }

  function pointTouchesReserved(x, y, lanes, pad = 0) {
    return lanes.some(lane => pointInRect(x, y, lane, pad));
  }

  function isPointBlocked(room, x, y, radius = NAV_RADIUS) {
    if (x < radius + 8 || y < radius + 8 || x > ROOM_W - radius - 8 || y > ROOM_H - radius - 8) return true;
    return room.obstacles.some(o => circleHitsRect(x, y, radius, o));
  }

  function buildNavGrid(room) {
    const cells = [];
    for (let y = 0; y < ROOM_ROWS; y++) {
      for (let x = 0; x < ROOM_COLS; x++) {
        const wx = x * TILE + TILE / 2;
        const wy = y * TILE + TILE / 2;
        cells.push(!isPointBlocked(room, wx, wy, NAV_RADIUS));
      }
    }
    return { cols: ROOM_COLS, rows: ROOM_ROWS, tile: TILE, cells };
  }

  function cellIndex(grid, x, y) {
    return y * grid.cols + x;
  }

  function pointToCell(grid, x, y) {
    return {
      x: clamp(Math.floor(x / grid.tile), 0, grid.cols - 1),
      y: clamp(Math.floor(y / grid.tile), 0, grid.rows - 1)
    };
  }

  function cellCenter(grid, cell) {
    return { x: cell.x * grid.tile + grid.tile / 2, y: cell.y * grid.tile + grid.tile / 2 };
  }

  function isCellOpen(grid, x, y) {
    return x >= 0 && y >= 0 && x < grid.cols && y < grid.rows && grid.cells[cellIndex(grid, x, y)];
  }

  function nearestOpenCell(grid, start) {
    if (isCellOpen(grid, start.x, start.y)) return start;
    const seen = new Set([`${start.x},${start.y}`]);
    const q = [start];
    while (q.length) {
      const cur = q.shift();
      for (const n of [{x:cur.x+1,y:cur.y},{x:cur.x-1,y:cur.y},{x:cur.x,y:cur.y+1},{x:cur.x,y:cur.y-1}]) {
        const k = `${n.x},${n.y}`;
        if (seen.has(k) || n.x < 0 || n.y < 0 || n.x >= grid.cols || n.y >= grid.rows) continue;
        if (isCellOpen(grid, n.x, n.y)) return n;
        seen.add(k);
        q.push(n);
      }
    }
    return null;
  }

  function ensureRoomNav(room) {
    if (!room.navGrid) room.navGrid = buildNavGrid(room);
    return room.navGrid;
  }

  function findPath(room, sx, sy, tx, ty) {
    const grid = ensureRoomNav(room);
    const start = nearestOpenCell(grid, pointToCell(grid, sx, sy));
    const goal = nearestOpenCell(grid, pointToCell(grid, tx, ty));
    if (!start || !goal) return [];
    const startKey = `${start.x},${start.y}`;
    const goalKey = `${goal.x},${goal.y}`;
    const open = [{ ...start, g: 0, f: Math.abs(start.x - goal.x) + Math.abs(start.y - goal.y) }];
    const cameFrom = new Map();
    const gScore = new Map([[startKey, 0]]);
    const closed = new Set();
    const dirs = [
      { x: 1, y: 0, c: 1 }, { x: -1, y: 0, c: 1 }, { x: 0, y: 1, c: 1 }, { x: 0, y: -1, c: 1 },
      { x: 1, y: 1, c: 1.42 }, { x: 1, y: -1, c: 1.42 }, { x: -1, y: 1, c: 1.42 }, { x: -1, y: -1, c: 1.42 }
    ];

    while (open.length) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      const curKey = `${cur.x},${cur.y}`;
      if (curKey === goalKey) {
        const path = [cellCenter(grid, cur)];
        let walk = curKey;
        while (cameFrom.has(walk)) {
          walk = cameFrom.get(walk);
          const [cx, cy] = walk.split(",").map(Number);
          path.push(cellCenter(grid, { x: cx, y: cy }));
        }
        path.reverse();
        path.push({ x: tx, y: ty });
        return path;
      }
      closed.add(curKey);
      for (const d of dirs) {
        const nx = cur.x + d.x, ny = cur.y + d.y;
        const nk = `${nx},${ny}`;
        if (closed.has(nk) || !isCellOpen(grid, nx, ny)) continue;
        if (d.x && d.y && (!isCellOpen(grid, cur.x + d.x, cur.y) || !isCellOpen(grid, cur.x, cur.y + d.y))) continue;
        const nextG = (gScore.get(curKey) || 0) + d.c;
        if (nextG >= (gScore.get(nk) ?? Infinity)) continue;
        cameFrom.set(nk, curKey);
        gScore.set(nk, nextG);
        const h = Math.abs(nx - goal.x) + Math.abs(ny - goal.y);
        const existing = open.find(n => n.x === nx && n.y === ny);
        if (existing) {
          existing.g = nextG;
          existing.f = nextG + h;
        } else {
          open.push({ x: nx, y: ny, g: nextG, f: nextG + h });
        }
      }
    }
    return [];
  }

  function findNearestReachablePoint(room, x, y) {
    const grid = ensureRoomNav(room);
    const cell = nearestOpenCell(grid, pointToCell(grid, x, y));
    return cell ? cellCenter(grid, cell) : { x: ROOM_W / 2, y: ROOM_H / 2 };
  }

  function hasLineOfSight(room, x1, y1, x2, y2, radius = 6) {
    const steps = Math.max(1, Math.ceil(dist(x1, y1, x2, y2) / 18));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = lerp(x1, x2, t);
      const y = lerp(y1, y2, t);
      if (room.obstacles.some(o => circleHitsRect(x, y, radius, o))) return false;
    }
    return true;
  }

  function clearReservedGeometry(room) {
    room.obstacles = room.obstacles.filter(o => !rectTouchesReserved(o, room.reservedLanes, 6));
    room.navGrid = buildNavGrid(room);
  }

  function buildRoomSpawnPoints(room) {
    const grid = ensureRoomNav(room);
    const points = [];
    for (let y = 2; y < grid.rows - 2; y++) {
      for (let x = 2; x < grid.cols - 2; x++) {
        if (!isCellOpen(grid, x, y)) continue;
        const p = cellCenter(grid, { x, y });
        if (dist(p.x, p.y, ROOM_W / 2, ROOM_H / 2) < 170) continue;
        if (pointTouchesReserved(p.x, p.y, room.reservedLanes, 12)) continue;
        points.push(p);
      }
    }
    return points;
  }

  function validateRoomNavigation(room) {
    room.doorZones = room.doorZones || buildRoomDoorZones(room.exits);
    room.reservedLanes = room.reservedLanes || buildRoomReservedLanes(room.exits);
    clearReservedGeometry(room);
    const center = { x: ROOM_W / 2, y: ROOM_H / 2 };
    for (const dir of room.exits) {
      const target = getDoorSpawnPoint(dir);
      if (!findPath(room, center.x, center.y, target.x, target.y).length) {
        room.obstacles = room.obstacles.filter(o => !rectTouchesReserved(o, buildRoomReservedLanes([dir]), 18));
        room.navGrid = buildNavGrid(room);
      }
    }
    room.spawnPoints = buildRoomSpawnPoints(room);
    room.validated = room.exits.every(dir => {
      const target = getDoorSpawnPoint(dir);
      return findPath(room, center.x, center.y, target.x, target.y).length > 0;
    }) && room.spawnPoints.length > 0;
    return room.validated;
  }

    Object.assign(D, {
      NAV_RADIUS,
      buildRoomDoorZones,
      buildRoomReservedLanes,
      rectsOverlap,
      rectTouchesReserved,
      pointTouchesReserved,
      pointInRect,
      circleHitsRect,
      doorCenter,
      getDoorSpawnPoint,
      isPointBlocked,
      buildNavGrid,
      ensureRoomNav,
      findPath,
      findNearestReachablePoint,
      hasLineOfSight,
      buildRoomSpawnPoints,
      validateRoomNavigation
    });
  }
})(window.Depthbound = window.Depthbound || {});
