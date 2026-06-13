(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};
  const { CONFIG, TILE_TYPES } = Lanternfall;
  const { hash, valueNoise, tileKey } = Lanternfall.math;

  class World {
    constructor(seed = CONFIG.defaultSeed) {
      this.seed = seed;
      this.tileCache = new Map();
      this.objective = this.createObjective(seed);
    }

    reset(seed = this.seed) {
      this.seed = seed;
      this.tileCache.clear();
      this.objective = this.createObjective(seed);
    }

    createObjective(seed) {
      const angle = hash(11, 23, seed + 404) * Math.PI * 2;
      const radius = CONFIG.run.objectiveRadius + Math.floor(hash(29, 31, seed + 405) * CONFIG.run.objectiveVariance);
      return {
        x: Math.round(Math.cos(angle) * radius),
        y: Math.round(Math.sin(angle) * radius)
      };
    }

    getObjective() {
      return { x: this.objective.x, y: this.objective.y };
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

      if (type !== TILE_TYPES.WALL && type !== TILE_TYPES.CAMP && type !== TILE_TYPES.RELIC) {
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
      if (x === 0 && y === 0) {
        return TILE_TYPES.CAMP;
      }

      if (x === this.objective.x && y === this.objective.y) {
        return TILE_TYPES.RELIC;
      }

      if (Math.abs(x) <= 2 && Math.abs(y) <= 2) {
        return TILE_TYPES.FLOOR;
      }

      if (this.isObjectiveChamber(x, y) || this.isCampChamber(x, y) || this.isExpeditionPath(x, y)) {
        return TILE_TYPES.FLOOR;
      }

      if (this.isTreasurePatch(x, y)) {
        return TILE_TYPES.TREASURE;
      }

      return this.terrain(x, y) > 0.47 ? TILE_TYPES.FLOOR : TILE_TYPES.WALL;
    }

    isCampChamber(x, y) {
      return x * x + y * y <= 8;
    }

    isObjectiveChamber(x, y) {
      const dx = x - this.objective.x;
      const dy = y - this.objective.y;
      return dx * dx + dy * dy <= 14;
    }

    isExpeditionPath(x, y) {
      const ox = this.objective.x;
      const oy = this.objective.y;
      const lengthSq = ox * ox + oy * oy;
      if (lengthSq === 0) return false;

      const progress = Math.max(0, Math.min(1, (x * ox + y * oy) / lengthSq));
      const px = ox * progress;
      const py = oy * progress;
      const distance = Math.hypot(x - px, y - py);
      const pathNoise = hash(Math.round(progress * 24), Math.round(progress * 41), this.seed + 606);
      return distance <= 1.45 + pathNoise * 1.2;
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
      if (roll < 0.44) return "gem";
      if (roll < 0.62) return "oil";
      if (roll < 0.78) return "speed";
      if (roll < 0.94) return "lantern";
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
