(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};
  const { CONFIG, TILE_TYPES } = Lanternfall;
  const { tileKey } = Lanternfall.math;

  class MinimapRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
    }

    resize(size = CONFIG.minimap.size) {
      this.canvas.width = size;
      this.canvas.height = size;
    }

    render(state, world) {
      const ctx = this.ctx;
      const size = this.canvas.width;
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = "rgba(11,10,16,0.92)";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();

      const pos = Lanternfall.getPlayerPos(state);
      const range = CONFIG.minimap.range;
      const px = size / (range * 2 + 1);
      const cx = Math.round(pos.x);
      const cy = Math.round(pos.y);

      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      for (let dy = -range; dy <= range; dy++) {
        for (let dx = -range; dx <= range; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (!state.explored.has(tileKey(x, y))) continue;

          const tile = world.getTile(x, y);
          ctx.fillStyle = this.tileColor(tile.type);
          const sx = (dx + range) * px;
          const sy = (dy + range) * px;
          ctx.fillRect(sx, sy, px + 0.6, px + 0.6);

          if (tile.item && !tile.item.taken) {
            ctx.fillStyle = "#ffe9a8";
            ctx.fillRect(sx + px * 0.25, sy + px * 0.25, px * 0.5, px * 0.5);
          }
        }
      }

      ctx.restore();
      ctx.fillStyle = "#ffb454";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    tileColor(type) {
      if (type === TILE_TYPES.WALL) return "#1c1a24";
      if (type === TILE_TYPES.TREASURE) return "#e0b94f";
      return "#9c8264";
    }
  }

  Lanternfall.MinimapRenderer = MinimapRenderer;
})();
