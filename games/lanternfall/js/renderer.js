(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};
  const { CONFIG, TILE_TYPES } = Lanternfall;
  const { clamp, tileKey } = Lanternfall.math;

  class CanvasRenderer {
    constructor(canvas, hostWindow = window) {
      this.canvas = canvas;
      this.window = hostWindow;
      this.ctx = canvas.getContext("2d");
      this.width = 0;
      this.height = 0;
    }

    resize(width = this.window.innerWidth, height = this.window.innerHeight, dpr = this.window.devicePixelRatio || 1) {
      this.width = width;
      this.height = height;
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    render(state, world) {
      const ctx = this.ctx;
      const tileSize = CONFIG.tileSize;
      ctx.fillStyle = CONFIG.colors.void;
      ctx.fillRect(0, 0, this.width, this.height);

      const pos = Lanternfall.getPlayerPos(state);
      const camX = pos.x * tileSize + tileSize / 2;
      const camY = pos.y * tileSize + tileSize / 2;
      const range = this.getVisibleTileRange(pos);

      for (let y = range.startY; y <= range.endY; y++) {
        for (let x = range.startX; x <= range.endX; x++) {
          if (!state.explored.has(tileKey(x, y))) continue;
          this.drawTile(state, world, x, y, pos, camX, camY);
        }
      }

      this.drawParticles(state, camX, camY);
      this.drawPlayer(state);
      this.drawCompass(state, pos);
    }

    getVisibleTileRange(pos) {
      const tileSize = CONFIG.tileSize;
      const tilesX = Math.ceil(this.width / tileSize) + 2;
      const tilesY = Math.ceil(this.height / tileSize) + 2;
      const startX = Math.floor(pos.x - tilesX / 2) - 1;
      const startY = Math.floor(pos.y - tilesY / 2) - 1;
      return {
        startX,
        startY,
        endX: startX + tilesX + 2,
        endY: startY + tilesY + 2
      };
    }

    drawTile(state, world, x, y, pos, camX, camY) {
      const ctx = this.ctx;
      const tileSize = CONFIG.tileSize;
      const tile = world.getTile(x, y);
      const distance = Math.hypot(x - pos.x, y - pos.y);
      const brightness = distance <= state.visionRadius
        ? clamp(1 - (distance / state.visionRadius) * 0.65, 0.35, 1)
        : 0.16;

      const sx = Math.round(x * tileSize - camX + this.width / 2);
      const sy = Math.round(y * tileSize - camY + this.height / 2);
      const base = this.tileColor(tile.type);
      const shade = tile.shade;

      ctx.fillStyle = `rgb(${Math.round(base[0] * shade)},${Math.round(base[1] * shade)},${Math.round(base[2] * shade)})`;
      ctx.fillRect(sx, sy, tileSize, tileSize);

      if (tile.type === TILE_TYPES.WALL) {
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(sx, sy, tileSize, 3);
      }

      if (brightness > 0.5) {
        ctx.fillStyle = `rgba(255,180,84,${(brightness - 0.5) * 0.5})`;
        ctx.fillRect(sx, sy, tileSize, tileSize);
      }

      if (brightness < 1) {
        ctx.fillStyle = `rgba(11,10,16,${1 - brightness})`;
        ctx.fillRect(sx, sy, tileSize, tileSize);
      }

      if (tile.item && !tile.item.taken && tile.type !== TILE_TYPES.WALL) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.25, brightness);
        ctx.font = `${tileSize * 0.55}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(CONFIG.items.icons[tile.item.kind], sx + tileSize / 2, sy + tileSize / 2 + 1);
        ctx.restore();
      }
    }

    tileColor(type) {
      if (type === TILE_TYPES.WALL) return CONFIG.colors.wall;
      if (type === TILE_TYPES.TREASURE) return CONFIG.colors.treasure;
      return CONFIG.colors.floor;
    }

    drawParticles(state, camX, camY) {
      const ctx = this.ctx;
      const tileSize = CONFIG.tileSize;
      state.particles.forEach((particle) => {
        const alpha = particle.life / particle.maxLife;
        const sx = particle.x * tileSize - camX + this.width / 2 + tileSize / 2;
        const sy = particle.y * tileSize - camY + this.height / 2 + tileSize / 2;
        ctx.fillStyle = `rgba(255,200,140,${alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(sx, sy, tileSize * 0.1 * alpha + 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    drawPlayer(state) {
      const ctx = this.ctx;
      const tileSize = CONFIG.tileSize;
      const x = this.width / 2;
      const y = this.height / 2;
      const glowRadius = state.visionRadius * tileSize * 0.9;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, "rgba(255,200,130,0.18)");
      gradient.addColorStop(1, "rgba(255,200,130,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - glowRadius, y - glowRadius, glowRadius * 2, glowRadius * 2);

      ctx.fillStyle = "#2b2420";
      ctx.beginPath();
      ctx.arc(x, y, tileSize * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb454";
      ctx.beginPath();
      ctx.arc(x, y, tileSize * 0.24, 0, Math.PI * 2);
      ctx.fill();

      const direction = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.player.facing] || [0, 1];
      ctx.fillStyle = "#2b2420";
      ctx.beginPath();
      ctx.arc(x + direction[0] * tileSize * 0.12, y + direction[1] * tileSize * 0.12, tileSize * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }

    drawCompass(state, pos) {
      if (!state.compassPing) return;

      const dx = state.compassPing.x - pos.x;
      const dy = state.compassPing.y - pos.y;
      if (Math.hypot(dx, dy) <= state.visionRadius) return;

      const ctx = this.ctx;
      const angle = Math.atan2(dy, dx);
      const ringRadius = Math.min(this.width, this.height) * 0.38;
      const x = this.width / 2 + Math.cos(angle) * ringRadius;
      const y = this.height / 2 + Math.sin(angle) * ringRadius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(255,180,84,0.85)";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, 7);
      ctx.lineTo(-6, -7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  Lanternfall.CanvasRenderer = CanvasRenderer;
})();
