// Rendering is intentionally canvas-only; UI DOM updates live in ui.js.

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, state.h);
    g.addColorStop(0, "#11152d");
    g.addColorStop(0.48, "#2c2738");
    g.addColorStop(1, "#5b3c2d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.w, state.h);

    const cam = state.cameraX;
    const farDrop = terrainOffset() * 0.34;
    drawParallaxLayer(cam, 0.08, 170 + farDrop, "#181d37", 0.5);
    drawParallaxLayer(cam, 0.16, 225 + farDrop * 0.8, "#202541", 0.65);
    drawParallaxLayer(cam, 0.28, 280 + farDrop * 0.6, "#2b304b", 0.82);

    ctx.fillStyle = "rgba(255, 230, 160, 0.35)";
    ctx.beginPath();
    ctx.arc(state.w * 0.72, 90, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawParallaxLayer(cam, factor, baseY, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, state.h);
    for (let sx = -100; sx <= state.w + 160; sx += 130) {
      const wx = sx + cam * factor;
      const peak = baseY + Math.sin(wx * 0.006) * 35;
      ctx.lineTo(sx, peak);
      ctx.lineTo(sx + 65, peak - 75 - Math.sin(wx * 0.013) * 30);
      ctx.lineTo(sx + 130, peak);
    }
    ctx.lineTo(state.w, state.h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawTerrain(cam) {
    ctx.save();
    ctx.translate(-cam, 0);

    ctx.fillStyle = "#201a1d";
    ctx.beginPath();
    ctx.moveTo(0, state.h + 200);
    for (let x = 0; x <= WORLD_W; x += 18) {
      ctx.lineTo(x, terrainY(x));
    }
    ctx.lineTo(WORLD_W, state.h + 200);
    ctx.closePath();
    ctx.fill();

    const earth = ctx.createLinearGradient(0, 280 + terrainOffset() * 0.75, 0, state.h);
    earth.addColorStop(0, "#5f4a35");
    earth.addColorStop(0.35, "#44311f");
    earth.addColorStop(1, "#1c1512");

    ctx.fillStyle = earth;
    ctx.beginPath();
    ctx.moveTo(0, state.h + 200);
    for (let x = 0; x <= WORLD_W; x += 12) {
      ctx.lineTo(x, terrainY(x) + 18);
    }
    ctx.lineTo(WORLD_W, state.h + 200);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,232,174,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= WORLD_W; x += 12) {
      const y = terrainY(x);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    drawTerraceLines();
    drawCastle(state.playerCastle.x, terrainY(state.playerCastle.x), 1);
    drawCastle(state.enemyCastle.x, terrainY(state.enemyCastle.x), -1);

    drawFrontlineMarkers();

    ctx.restore();
  }

  function drawTerraceLines() {
    for (const [x1, x2] of TERRACE_SEGMENTS) {
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x1, terrainY(x1) + 17);
      ctx.lineTo(x2, terrainY(x2) + 17);
      ctx.stroke();
    }

    for (const [a, b] of TERRAIN_FLATS) {
      const y = terrainY((a + b) / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a, y + 3);
      ctx.lineTo(b, y + 3);
      ctx.stroke();
    }
  }

  function drawCastle(x, ground, side) {
    const isPlayer = side === 1;
    const hp = isPlayer ? state.playerCastle.hp : state.enemyCastle.hp;
    const maxHp = isPlayer ? state.playerCastle.maxHp : state.enemyCastle.maxHp;
    const color = isPlayer ? "#375f97" : "#8c3434";
    const dark = isPlayer ? "#203552" : "#562323";

    ctx.save();
    ctx.translate(x, ground);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 115, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dark;
    ctx.fillRect(-80, -125, 160, 125);

    ctx.fillStyle = color;
    ctx.fillRect(-62, -158, 44, 158);
    ctx.fillRect(18, -158, 44, 158);
    ctx.fillRect(-92, -92, 184, 92);

    ctx.fillStyle = "#1a1418";
    ctx.fillRect(-20, -55, 40, 55);

    for (let i = -70; i <= 70; i += 35) {
      ctx.fillStyle = "rgba(255,255,255,0.13)";
      ctx.fillRect(i, -78, 14, 18);
    }

    for (const tx of [-62, 18]) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tx, -158);
      ctx.lineTo(tx + 22, -198);
      ctx.lineTo(tx + 44, -158);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 4;
    ctx.strokeRect(-80, -125, 160, 125);

    const flagX = isPlayer ? -98 : 98;
    ctx.strokeStyle = "#d8c7ac";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(flagX, -170);
    ctx.lineTo(flagX, -220);
    ctx.stroke();

    ctx.fillStyle = isPlayer ? "#76b7ff" : "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(flagX, -218);
    ctx.lineTo(flagX + side * 55, -205);
    ctx.lineTo(flagX, -190);
    ctx.closePath();
    ctx.fill();

    const pct = clamp(hp / maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(-70, -230, 140, 12);
    ctx.fillStyle = isPlayer ? "#76b7ff" : "#ff6b6b";
    ctx.fillRect(-70, -230, 140 * pct, 12);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(-70, -230, 140, 12);

    if (isPlayer && state.playerCastle.wallLevel > 0) {
      ctx.fillStyle = "#6d6b6a";
      const extra = Math.min(38, state.playerCastle.wallLevel * 10);
      ctx.fillRect(-105, -45 - extra, 32, 45 + extra);
      ctx.fillRect(73, -45 - extra, 32, 45 + extra);
    }

    if (isPlayer && state.playerCastle.tower > 0) {
      ctx.fillStyle = "#455d7a";
      ctx.fillRect(-120, -112, 34, 112);
      ctx.fillRect(86, -112, 34, 112);
    }

    ctx.restore();
  }

  function drawFrontlineMarkers() {
    const f = frontlineX();
    const y = terrainY(f);

    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "#f2c14e";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(f, y - 130);
    ctx.lineTo(f, y + 30);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(242,193,78,0.18)";
    ctx.beginPath();
    ctx.ellipse(f, y - 4, 70, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f2c14e";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("FRONTLINE", f, y - 138);
    ctx.restore();
  }

  const unitRenderers = {
    shield: drawShieldUnit,
    archer: drawArcherUnit,
    knight: drawKnightUnit,
    priest: drawPriestUnit,
    sword: drawSwordUnit
  };

  function drawShieldUnit(u, sideColor) {
    ctx.fillRect(-u.size * 0.75, -u.size * 1.8, u.size * 1.5, u.size * 2.4);
    ctx.fillStyle = sideColor;
    ctx.fillRect(-u.size * 0.52, -u.size * 1.55, u.size * 1.04, u.size * 1.55);
  }

  function drawArcherUnit(u) {
    ctx.beginPath();
    ctx.arc(0, -u.size * 1.35, u.size * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d8c7ac";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(u.side * 7, -u.size, 13, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }

  function drawKnightUnit(u, sideColor) {
    ctx.fillRect(-u.size, -u.size * 1.65, u.size * 2, u.size * 1.35);
    ctx.fillStyle = sideColor;
    ctx.beginPath();
    ctx.moveTo(u.side * 4, -u.size * 2.4);
    ctx.lineTo(u.side * 32, -u.size * 2.0);
    ctx.lineTo(u.side * 4, -u.size * 1.7);
    ctx.closePath();
    ctx.fill();
  }

  function drawPriestUnit(u) {
    ctx.beginPath();
    ctx.arc(0, -u.size * 1.2, u.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff5bd";
    ctx.fillRect(-2, -u.size * 2.1, 4, 18);
    ctx.fillRect(-8, -u.size * 1.75, 16, 4);
  }

  function drawSwordUnit(u) {
    ctx.beginPath();
    ctx.arc(0, -u.size * 1.4, u.size * 0.78, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-u.size * 0.55, -u.size * 1.2, u.size * 1.1, u.size * 1.45);
    ctx.strokeStyle = "#d8c7ac";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(u.side * 7, -u.size);
    ctx.lineTo(u.side * 22, -u.size * 2.2);
    ctx.stroke();
  }

  function drawUnit(u) {
    const x = u.x;
    const y = terrainY(u.x) - u.size + u.lane * 5;
    const sideColor = u.side === 1 ? "#76b7ff" : "#ff6b6b";

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, u.size + 5, u.size + 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (u.flash > 0) {
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = "#fff";
    } else {
      ctx.fillStyle = u.color;
    }

    const drawShape = unitRenderers[u.type] || drawSwordUnit;
    drawShape(u, sideColor);

    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.58)";
    ctx.fillRect(-u.size, -u.size * 2.72, u.size * 2, 5);
    ctx.fillStyle = sideColor;
    ctx.fillRect(-u.size, -u.size * 2.72, u.size * 2 * clamp(u.hp / u.maxHp, 0, 1), 5);

    ctx.restore();
  }

  function drawUnits(cam) {
    const sorted = [...state.units].sort((a, b) => {
      const ay = terrainY(a.x) + a.lane * 8;
      const by = terrainY(b.x) + b.lane * 8;
      return ay - by;
    });

    for (const u of sorted) {
      if (u.x < cam - 80 || u.x > cam + state.w + 80) continue;
      drawUnit(u);
    }

    drawStackIndicators(cam);
  }

  function drawStackIndicators(cam) {
    const buckets = new Map();

    for (const u of state.units) {
      if (u.x < cam - 50 || u.x > cam + state.w + 50) continue;
      const key = Math.floor(u.x / 70) + "_" + u.side;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(u);
    }

    for (const group of buckets.values()) {
      if (group.length < 4) continue;

      const avgX = group.reduce((a, u) => a + u.x, 0) / group.length;
      const y = terrainY(avgX) - 82;
      const side = group[0].side;
      const color = side === 1 ? "#76b7ff" : "#ff6b6b";
      const counts = {};
      for (const u of group) counts[u.type] = (counts[u.type] || 0) + 1;
      const label = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([type, count]) => count + " " + unitDefs[type].label)
        .join(" / ");
      const text = group.length > 6 ? label + " +" + (group.length - 6) : label;
      const width = clamp(text.length * 7 + 18, 56, 150);

      ctx.save();
      ctx.globalAlpha = clamp(1 - Math.abs(avgX - (cam + state.w / 2)) / (state.w * 0.75), 0.45, 0.9);
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      roundRect(ctx, avgX - width / 2, y - 16, width, 24, 10, true, true);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(text, avgX, y);
      ctx.restore();
    }
  }

  function drawHero() {
    const h = state.hero;
    ctx.save();
    ctx.translate(h.x, h.y);

    const hurt = h.hurtTimer > 0;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, h.h + 4, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hurt ? "#fff" : "#77b9ff";
    ctx.fillRect(-12, 10, 24, 31);
    ctx.beginPath();
    ctx.arc(0, 3, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f2c14e";
    ctx.beginPath();
    ctx.moveTo(-5, 18);
    ctx.lineTo(h.facing * 44, 8);
    ctx.lineTo(h.facing * 8, 28);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#f5eee6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(h.facing * 14, 22);
    ctx.lineTo(h.facing * 42, 2);
    ctx.stroke();

    if (h.attackTimer > 0.25) {
      ctx.strokeStyle = "rgba(255,240,180,0.8)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(h.facing * 36, 20, 34, -1.2, 1.2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(-24, -24, 48, 6);
    ctx.fillStyle = "#76b7ff";
    ctx.fillRect(-24, -24, 48 * clamp(h.hp / h.maxHp, 0, 1), 6);

    ctx.restore();
  }

  function drawProjectiles() {
    for (const p of state.projectiles) {
      ctx.save();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const f of state.floatTexts) {
      ctx.save();
      ctx.globalAlpha = clamp(f.life, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function drawMinimap() {
    const w = 250;
    const h = 34;
    const x = state.w / 2 - w / 2;
    const y = state.h - 120;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.48)";
    roundRect(ctx, x, y, w, h, 12, true, false);

    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.strokeRect(x + 8, y + 12, w - 16, 7);

    const f = x + 8 + (frontlineX() / WORLD_W) * (w - 16);
    const heroX = x + 8 + (state.hero.x / WORLD_W) * (w - 16);

    ctx.fillStyle = "#76b7ff";
    ctx.fillRect(x + 8, y + 12, 8, 7);
    ctx.fillStyle = "#ff6b6b";
    ctx.fillRect(x + w - 16, y + 12, 8, 7);

    ctx.fillStyle = "#f2c14e";
    ctx.beginPath();
    ctx.arc(f, y + 15.5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(heroX, y + 15.5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Valley control", x + w / 2, y + 29);
    ctx.restore();
  }

  function render() {
    drawSky();

    let sx = 0;
    let sy = 0;
    if (state.shake > 0) {
      sx = rand(-state.shake, state.shake);
      sy = rand(-state.shake, state.shake);
    }

    ctx.save();
    ctx.translate(sx, sy);
    const cam = state.cameraX;

    drawTerrain(cam);

    ctx.save();
    ctx.translate(-cam, 0);
    drawProjectiles();
    drawUnits(cam);
    drawHero();
    drawParticles();
    ctx.restore();

    ctx.restore();

    drawMinimap();

    if (state.paused && !state.gameOver) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, state.w, state.h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 36px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", state.w / 2, state.h / 2);
      ctx.font = "16px system-ui";
      ctx.fillText("Press P to resume", state.w / 2, state.h / 2 + 34);
      ctx.restore();
    }
  }

Object.assign(window.CastlefallValley, { drawSky, drawParallaxLayer, drawTerrain, drawTerraceLines, drawCastle, drawFrontlineMarkers, drawUnits, drawUnit, unitRenderers, drawStackIndicators, drawHero, drawProjectiles, drawParticles, drawMinimap, render });
