(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};
  const { CONFIG, TILE_TYPES } = Lanternfall;
  const { hash, valueNoise, tileKey } = Lanternfall.math;

  class World {
    constructor(seed = CONFIG.defaultSeed) {
      this.seed = seed;
      this.tileCache = new Map();
    }

    reset(seed = this.seed) {
      this.seed = seed;
      this.tileCache.clear();
    }

    terrain(x, y) {
      return valueNoise(x / 9, y / 9, this.seed) * 0.5 + valueNoise(x / 3.2, y / 3.2, this.seed + 101) * 0.5;
    }

    getTile(x, y) {
      const key = tileKey(x, y);
      const cached = this.tileCache.get(key);
      if (cached) return cached;

      const tile = this.createTile(x, y);
      this.tileCache.set(key, tile);
      return tile;
    }

    setTile(x, y, tile) {
      this.tileCache.set(tileKey(x, y), tile);
      return tile;
    }

    createTile(x, y) {
      const type = this.createTileType(x, y);
      let item = null;

      if (type !== TILE_TYPES.WALL && !(Math.abs(x) <= 1 && Math.abs(y) <= 1)) {
        const itemRoll = hash(x, y, this.seed + 1000);
        const threshold = type === TILE_TYPES.TREASURE ? CONFIG.items.treasureChance : CONFIG.items.floorChance;
        if (itemRoll < threshold) {
          item = { kind: this.createItemKind(x, y), taken: false };
        }
      }

      return {
        type,
        item,
        shade: 0.85 + hash(x, y, this.seed + 5000) * 0.3
      };
    }

    createTileType(x, y) {
      if (Math.abs(x) <= 2 && Math.abs(y) <= 2) {
        return TILE_TYPES.FLOOR;
      }

      if (this.isTreasurePatch(x, y)) {
        return TILE_TYPES.TREASURE;
      }

      return this.terrain(x, y) > 0.47 ? TILE_TYPES.FLOOR : TILE_TYPES.WALL;
    }

    isTreasurePatch(x, y) {
      const cell = CONFIG.treasure.cell;
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      if (hash(cx, cy, this.seed + 777) >= CONFIG.treasure.chance) {
        return false;
      }

      const tx = cx * cell + Math.floor(hash(cx, cy, this.seed + 778) * cell);
      const ty = cy * cell + Math.floor(hash(cx, cy, this.seed + 779) * cell);
      const dx = x - tx;
      const dy = y - ty;
      return dx * dx + dy * dy <= CONFIG.treasure.radiusSq;
    }

    createItemKind(x, y) {
      const roll = hash(x, y, this.seed + 2000);
      if (roll < 0.52) return "gem";
      if (roll < 0.74) return "speed";
      if (roll < 0.92) return "lantern";
      return "compass";
    }

    findNearestItem(cx, cy, maxRadius) {
      for (let r = 1; r <= maxRadius; r++) {
        let best = null;
        let bestDistance = Infinity;

        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;

            const x = cx + dx;
            const y = cy + dy;
            const tile = this.getTile(x, y);
            if (tile.item && !tile.item.taken) {
              const distance = dx * dx + dy * dy;
              if (distance < bestDistance) {
                bestDistance = distance;
                best = { x, y };
              }
            }
          }
        }

        if (best) return best;
      }

      return null;
    }
  }

  Lanternfall.World = World;
  Lanternfall.createWorld = (seed) => new World(seed);
})();
