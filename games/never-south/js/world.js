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

  function getTileRuleMode(world) {
    return (world && world.tileRuleMode) || (ns.CONFIG.tiles && ns.CONFIG.tiles.ruleMode) || "basic";
  }

  function legacyGenerateTile(world, col, row) {
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

  function generateTile(world, col, row) {
    if (getTileRuleMode(world) === "legacy") {
      return legacyGenerateTile(world, col, row);
    }
    return makeTile(TILE.SAFE);
  }

  function legacyCanEnterTile(tile, card) {
    if (!tile || tile.type === TILE.GAP) return false;
    if (tile.type === TILE.RUBBLE && !card.traits.includes("clearRubble")) return false;
    if (tile.type === TILE.FOG && !card.traits.includes("reveal") && !card.traits.includes("passFog")) return false;
    return true;
  }

  function canEnterTile(tile, card, run) {
    if (!tile) return false;
    if (getTileRuleMode(run && run.world) === "legacy") {
      return legacyCanEnterTile(tile, card || { traits: [] });
    }
    return true;
  }

  function legacyIsTilePathable(tile) {
    return tile && tile.type !== TILE.GAP;
  }

  function isTilePathable(tile, world) {
    if (!tile) return false;
    if (getTileRuleMode(world) === "legacy") {
      return legacyIsTilePathable(tile);
    }
    return true;
  }

  function legacyApplyLeavingTile(tile, card) {
    if (tile && tile.type === TILE.CRACKED && !card.traits.includes("careful")) {
      tile.type = TILE.GAP;
      tile.broken = true;
    }
  }

  function applyLeavingTile(tile, card, run) {
    if (getTileRuleMode(run && run.world) === "legacy") {
      legacyApplyLeavingTile(tile, card || { traits: [] });
    }
  }

  function legacyApplyMovedOntoTile(tile, card, run) {
    if (tile && tile.type === TILE.RUBBLE && card.traits.includes("clearRubble")) {
      tile.type = TILE.SAFE;
      run.player.scrap += 1;
    }
  }

  function applyMovedOntoTile(tile, card, run) {
    if (getTileRuleMode(run && run.world) === "legacy") {
      legacyApplyMovedOntoTile(tile, card || { traits: [] }, run);
    }
  }

  function legacyApplyLandingTile(tile, run) {
    if (tile.type === TILE.SCRAP && !tile.collected) {
      run.player.scrap += 1;
      tile.collected = true;
      run.addLog("Collected 1 Scrap.");
    } else if (tile.type === TILE.GLOW && !tile.collected) {
      run.player.glow += 1;
      tile.collected = true;
      run.addLog("Gathered 1 Glow.");
    } else if (tile.type === TILE.THORNS) {
      run.player.health -= 3;
      run.addLog("Thorns bite for 3 health.");
    } else if (tile.type === TILE.CRACKED) {
      run.addLog("The road cracks underfoot.");
    }
  }

  function applyLandingTile(tile, card, run) {
    if (!tile || getTileRuleMode(run && run.world) !== "legacy") return;
    legacyApplyLandingTile(tile, run);
  }

  function legacyGetTileActions(tile) {
    if (tile.type === TILE.SHOP) {
      return [
        { id: "buy-card", label: "Buy Card", detail: "Spend 2 Scrap for a new movement card." },
        { id: "repair", label: "Repair", detail: "Spend 1 Scrap to heal 6." },
        { id: "draw", label: "Draw", detail: "Draw 1 card before moving on." }
      ];
    }

    if (tile.type === TILE.SHRINE) {
      return [
        { id: "bless-card", label: "Bless Card", detail: "Spend 1 Glow to add return to your leftmost card." },
        { id: "reveal", label: "Reveal", detail: "Spend 1 Glow to reveal nearby fog." },
        { id: "heal-glow", label: "Cleansing Glow", detail: "Spend 1 Glow to heal 5." }
      ];
    }

    if (tile.type === TILE.CAMP) {
      return [
        { id: "camp-draw", label: "Draw", detail: "Draw 2 cards." },
        { id: "camp-shuffle", label: "Shuffle", detail: "Shuffle discard into deck." },
        { id: "camp-heal", label: "Rest", detail: "Heal 4." }
      ];
    }

    if (tile.type === TILE.RUBBLE) {
      return [
        { id: "clear-rubble", label: "Clear Rubble", detail: "Spend 1 Scrap to clear this tile." },
        { id: "leave-rubble", label: "Move On", detail: "Leave the rubble intact." }
      ];
    }

    return [];
  }

  function getTileActions(tile, run) {
    if (!tile) return [];
    if (getTileRuleMode(run && run.world) !== "legacy") {
      if (tile.type === TILE.SAFE && tile.visited && !tile.basicDrawUsed) {
        return [
          { id: "basic-draw", label: "Scavenge", detail: "Spend 3 Scrap to draw 1 card. Once per tile." }
        ];
      }
      return [];
    }
    return legacyGetTileActions(tile);
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
      return isTilePathable(tile, world);
    });
  }

  function ensureNonSouthPath(world, from) {
    if (!world || !from || hasNonSouthPath(world, from)) return;
    setTile(world, from.col, from.row - 1, makeTile(TILE.SAFE));
  }

  function generateZone(seed) {
    const world = {
      seed: seed || "zone",
      tileRuleMode: (ns.CONFIG.tiles && ns.CONFIG.tiles.ruleMode) || "basic",
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
  ns.getTileRuleMode = getTileRuleMode;
  ns.legacyGenerateTile = legacyGenerateTile;
  ns.canEnterTile = canEnterTile;
  ns.isTilePathable = isTilePathable;
  ns.applyLeavingTile = applyLeavingTile;
  ns.applyMovedOntoTile = applyMovedOntoTile;
  ns.applyLandingTile = applyLandingTile;
  ns.getTileActionsForRules = getTileActions;
  ns.generateZone = generateZone;
  ns.getTile = getTile;
  ns.setTile = setTile;
  ns.hasNonSouthPath = hasNonSouthPath;
  ns.ensureNonSouthPath = ensureNonSouthPath;
  window.NeverSouth = ns;
})();
