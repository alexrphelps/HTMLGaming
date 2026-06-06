(function() {
  "use strict";

  const ns = window.NeverSouth || {};
  const TILE = ns.TILE_TYPES;

  function makeTile(type, options) {
    return Object.assign({
      type,
      revealed: false,
      visited: false,
      broken: false
    }, options || {});
  }

  function tileKey(col, row) {
    return col + "," + row;
  }

  function isFiniteGridCoordinate(col, row) {
    return Number.isInteger(col) && Number.isInteger(row) && Number.isFinite(col) && Number.isFinite(row);
  }

  function inBounds(col, row) {
    return isFiniteGridCoordinate(col, row);
  }

  function generateTile(world, col, row) {
    const startCol = ns.CONFIG.grid.startCol;
    const startRow = ns.CONFIG.grid.startRow;
    const distanceNorth = startRow - row;
    const rng = ns.createRng(world.seed + ":" + col + "," + row);

    if (col === startCol && row === startRow) return makeTile(TILE.CAMP);
    if (distanceNorth > 0 && distanceNorth % 31 === 0 && Math.abs(col - startCol) <= 1) return makeTile(TILE.CAMP);
    if (distanceNorth > 0 && distanceNorth % 19 === 0 && ((col - startCol) % 4 === 0)) return makeTile(TILE.SHOP);
    if (distanceNorth > 0 && distanceNorth % 23 === 0 && ((col - startCol + 2) % 5 === 0)) return makeTile(TILE.SHRINE);

    let type = TILE.SAFE;
    const roll = rng.next();
    if (roll < 0.1) type = TILE.GAP;
    else if (roll < 0.22) type = TILE.RUBBLE;
    else if (roll < 0.32) type = TILE.CRACKED;
    else if (roll < 0.43) type = TILE.FOG;
    else if (roll < 0.53) type = TILE.THORNS;
    else if (roll < 0.63) type = TILE.SCRAP;
    else if (roll < 0.71) type = TILE.GLOW;

    return makeTile(type);
  }

  function getTile(world, col, row) {
    if (!world || !inBounds(col, row)) return null;
    const key = tileKey(col, row);
    if (!world.tilesByKey[key]) {
      world.tilesByKey[key] = generateTile(world, col, row);
    }
    return world.tilesByKey[key];
  }

  function setTile(world, col, row, tile) {
    if (!world || !inBounds(col, row)) return;
    world.tilesByKey[tileKey(col, row)] = tile;
  }

  function hasNonSouthPath(world, from) {
    return [
      { col: 0, row: -1 },
      { col: -1, row: -1 },
      { col: 1, row: -1 },
      { col: -1, row: 0 },
      { col: 1, row: 0 }
    ].some((offset) => {
      const col = from.col + offset.col;
      const row = from.row + offset.row;
      const tile = getTile(world, col, row);
      return tile && tile.type !== TILE.GAP;
    });
  }

  function ensureNonSouthPath(world, from) {
    if (!world || !from || hasNonSouthPath(world, from)) return;
    setTile(world, from.col, from.row - 1, makeTile(TILE.SAFE));
  }

  function generateZone(seed) {
    const world = {
      seed: seed || "zone",
      tilesByKey: Object.create(null),
      enemies: [
        { id: "pursuer-1", type: "pursuer", col: ns.CONFIG.grid.startCol - 3, row: ns.CONFIG.grid.startRow - 6, hp: 1, intent: null }
      ]
    };

    getTile(world, ns.CONFIG.grid.startCol, ns.CONFIG.grid.startRow);
    ensureNonSouthPath(world, { col: ns.CONFIG.grid.startCol, row: ns.CONFIG.grid.startRow });
    return world;
  }

  ns.makeTile = makeTile;
  ns.tileKey = tileKey;
  ns.inBounds = inBounds;
  ns.generateZone = generateZone;
  ns.getTile = getTile;
  ns.setTile = setTile;
  ns.hasNonSouthPath = hasNonSouthPath;
  ns.ensureNonSouthPath = ensureNonSouthPath;
  window.NeverSouth = ns;
})();
