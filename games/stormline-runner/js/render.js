(function() {
  "use strict";

  const ns = window.StormlineRunner;

  class StormRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.width = 0;
      this.height = 0;
      this.pixelRatio = 1;
      this.resize();
    }

    resize() {
      const bounds = this.canvas.getBoundingClientRect();
      this.pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      this.width = Math.max(320, bounds.width || window.innerWidth);
      this.height = Math.max(240, bounds.height || window.innerHeight);
      this.canvas.width = Math.floor(this.width * this.pixelRatio);
      this.canvas.height = Math.floor(this.height * this.pixelRatio);
      this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }

    render(state) {
      const ctx = this.ctx;
      const weather = state.weather;
      this.drawBackground(ctx, weather, state.cameraX, state.time);
      ctx.save();
      ctx.translate(-state.cameraX, 0);
      this.drawWorld(ctx, state.world, weather, state.time);
      this.drawPlayer(ctx, state.player, weather, state.time);
      ctx.restore();
      this.drawVignette(ctx, weather);
    }

    drawBackground(ctx, weather, cameraX, time) {
      const colors = weather.colors;
      const sky = ctx.createLinearGradient(0, 0, 0, this.height);
      sky.addColorStop(0, colors.skyTop);
      sky.addColorStop(0.48, colors.skyMid);
      sky.addColorStop(1, colors.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, this.width, this.height);

      for (let layer = 0; layer < 3; layer++) {
        const y = 90 + layer * 120;
        const speed = 0.08 + layer * 0.05;
        const offset = -((cameraX * speed + time * 22 * (layer + 1)) % 260);
        ctx.strokeStyle = layer === 0 ? "rgba(255,255,255,0.10)" : "rgba(64,232,255,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = offset - 260; x < this.width + 260; x += 130) {
          ctx.moveTo(x, y + Math.sin((x + time * 35) * 0.014) * 18);
          ctx.lineTo(x + 86, y + 26 + Math.cos((x + time * 45) * 0.011) * 14);
        }
        ctx.stroke();
      }

      const rainCount = weather.id === "overcast-calm" ? 18 : 42;
      ctx.strokeStyle = weather.id === "heat-bloom" ? "rgba(255,204,92,0.20)" : "rgba(198,244,255,0.22)";
      ctx.lineWidth = weather.id === "magnetic-rain" ? 2 : 1;
      for (let i = 0; i < rainCount; i++) {
        const x = (i * 97 - cameraX * 0.28 + time * 180) % (this.width + 120) - 80;
        const y = (i * 53 + time * 220) % (this.height + 80) - 40;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 24, y + 42);
        ctx.stroke();
      }
    }

    drawWorld(ctx, world, weather, time) {
      world.platforms.forEach((platform) => this.drawPlatform(ctx, platform, weather, time));
      world.hazards.forEach((hazard) => this.drawHazard(ctx, hazard, weather, time));
      world.pickups.forEach((pickup) => {
        if (!pickup.collected) this.drawPickup(ctx, pickup, weather, time);
      });
      world.shrines.forEach((shrine) => {
        if (!shrine.used) this.drawShrine(ctx, shrine, weather, time);
      });
    }

    drawPlatform(ctx, platform, weather, time) {
      const color = ns.WEATHER_BY_ID[platform.weatherId].colors.primary;
      ctx.save();
      ctx.fillStyle = platform.rail ? "rgba(255,255,255,0.08)" : "rgba(4, 10, 17, 0.78)";
      ctx.strokeStyle = platform.rail ? color : "rgba(255,255,255,0.18)";
      ctx.lineWidth = platform.rail ? 3 : 1;
      ctx.shadowColor = platform.rail ? color : "transparent";
      ctx.shadowBlur = platform.rail ? 18 : 0;
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
      ctx.strokeRect(platform.x + 0.5, platform.y + 0.5, platform.w - 1, platform.h - 1);
      if (platform.type === "ground") {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.24 + Math.sin(time * 3 + platform.x * 0.02) * 0.06;
        ctx.fillRect(platform.x, platform.y, platform.w, 4);
      }
      ctx.restore();
    }

    drawHazard(ctx, hazard, weather, time) {
      const pulse = 0.75 + Math.sin(time * 7 + hazard.x) * 0.25;
      ctx.save();
      ctx.fillStyle = hazard.type === "heat" ? "rgba(255, 88, 43, 0.72)" : "rgba(255, 230, 92, 0.68)";
      ctx.strokeStyle = weather.colors.hazard;
      ctx.shadowColor = weather.colors.hazard;
      ctx.shadowBlur = 18 * pulse;
      ctx.beginPath();
      ctx.moveTo(hazard.x, hazard.y + hazard.h);
      ctx.lineTo(hazard.x + hazard.w * 0.5, hazard.y);
      ctx.lineTo(hazard.x + hazard.w, hazard.y + hazard.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    drawPickup(ctx, pickup, weather, time) {
      const bob = Math.sin(time * 5 + pickup.x * 0.03) * 5;
      ctx.save();
      ctx.translate(pickup.x + pickup.w * 0.5, pickup.y + pickup.h * 0.5 + bob);
      ctx.rotate(time * 2.5);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.strokeStyle = weather.colors.secondary;
      ctx.shadowColor = weather.colors.secondary;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    drawShrine(ctx, shrine, weather, time) {
      const glow = 0.5 + Math.sin(time * 4) * 0.28;
      ctx.save();
      ctx.fillStyle = "rgba(5, 12, 20, 0.86)";
      ctx.strokeStyle = weather.colors.primary;
      ctx.shadowColor = weather.colors.primary;
      ctx.shadowBlur = 22 + glow * 16;
      ctx.fillRect(shrine.x, shrine.y, shrine.w, shrine.h);
      ctx.strokeRect(shrine.x + 0.5, shrine.y + 0.5, shrine.w - 1, shrine.h - 1);
      ctx.fillStyle = weather.colors.secondary;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(shrine.x + 12, shrine.y + 14 + glow * 8, shrine.w - 24, 8);
      ctx.fillRect(shrine.x + 19, shrine.y + 34, shrine.w - 38, shrine.h - 52);
      ctx.restore();
    }

    drawPlayer(ctx, player, weather, time) {
      const cx = player.x + player.w * 0.5;
      const cy = player.y + player.h * 0.5;
      const stride = player.grounded ? Math.sin(time * 16) * Math.min(1, Math.abs(player.vx) / 360) : 0;
      const invuln = player.invulnTimer > 0 && Math.floor(time * 18) % 2 === 0;

      ctx.save();
      ctx.globalAlpha = invuln ? 0.42 : 1;
      ctx.translate(cx, cy);
      ctx.strokeStyle = "#f7fbff";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = player.dashTimer > 0 ? weather.colors.primary : "rgba(64,232,255,0.45)";
      ctx.shadowBlur = player.dashTimer > 0 ? 24 : 10;

      ctx.beginPath();
      ctx.moveTo(0, -23);
      ctx.lineTo(0, 8);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -34, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = weather.colors.primary;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(player.facing * (18 + stride * 5), 4);
      ctx.moveTo(0, -5);
      ctx.lineTo(player.facing * -15, 6 + stride * 3);
      ctx.stroke();

      ctx.strokeStyle = "#f7fbff";
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(-10 - stride * 8, 28);
      ctx.moveTo(0, 8);
      ctx.lineTo(12 + stride * 8, 28);
      ctx.stroke();

      ctx.strokeStyle = weather.colors.secondary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -34, 15 + Math.sin(time * 6) * 2, -0.5, Math.PI + 0.5);
      ctx.stroke();
      ctx.restore();
    }

    drawVignette(ctx, weather) {
      const gradient = ctx.createRadialGradient(this.width * 0.5, this.height * 0.5, this.height * 0.2, this.width * 0.5, this.height * 0.5, this.height * 0.78);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.42)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  ns.StormRenderer = StormRenderer;
})();
