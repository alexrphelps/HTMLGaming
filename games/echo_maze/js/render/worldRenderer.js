(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function drawVoid(ctx, w, h) {
    const grd = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.max(w, h) * 0.78);
    grd.addColorStop(0, '#07121b');
    grd.addColorStop(0.72, '#02050a');
    grd.addColorStop(1, '#000000');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }

  function drawCellFloor(ctx, state, x, y, camX, camY) {
    const sx = x * em.CONFIG.cell - camX;
    const sy = y * em.CONFIG.cell - camY;
    const lit = em.isLitCell(state, x, y);
    const d = em.distanceToPlayerCell(state, x, y);
    const lightFade = Math.max(0, 1 - d / (state.player.vision + 1.5));
    const biome = em.biomeForCell ? em.biomeForCell(state, x, y) : null;
    const litFloor = biome ? biome.floor : [18, 34, 45];
    const darkFloor = biome ? biome.darkFloor : [8, 13, 18];

    ctx.fillStyle = lit
      ? em.rgbaFrom(litFloor, 0.50 + lightFade * 0.38)
      : em.rgbaFrom(darkFloor, 0.72);
    ctx.fillRect(sx, sy, em.CONFIG.cell, em.CONFIG.cell);

    ctx.strokeStyle = lit ? 'rgba(125, 249, 255, 0.045)' : 'rgba(125, 249, 255, 0.018)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, em.CONFIG.cell - 1, em.CONFIG.cell - 1);

    if (lit && em.rand01(state, x, y, 9090) < (biome ? biome.moteRate : 0.12)) {
      ctx.fillStyle = em.alphaColor(biome ? biome.accent : '#7df9ff', 0.05 + em.rand01(state, x, y, 9093) * 0.12);
      ctx.beginPath();
      ctx.arc(
        sx + em.CONFIG.cell * em.rand01(state, x, y, 9091),
        sy + em.CONFIG.cell * em.rand01(state, x, y, 9092),
        1.1,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  function drawCellWalls(ctx, state, x, y, camX, camY) {
    const sx = x * em.CONFIG.cell - camX;
    const sy = y * em.CONFIG.cell - camY;
    const lit = em.isLitCell(state, x, y);
    const alpha = lit ? 0.94 : 0.35;
    const biome = em.biomeForCell ? em.biomeForCell(state, x, y) : null;
    const wall = biome ? biome.wall : [140, 210, 230];

    ctx.lineWidth = lit ? 5 : 4;
    ctx.lineCap = 'square';
    ctx.strokeStyle = em.rgbaFrom(wall, alpha);
    ctx.shadowColor = lit ? em.alphaColor(biome ? biome.accent : '#7df9ff', 0.18) : 'transparent';
    ctx.shadowBlur = lit ? 6 : 0;
    ctx.beginPath();

    if (em.isBlockedBetween(state, x, y, x, y - 1)) {
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + em.CONFIG.cell, sy);
    }

    if (em.isBlockedBetween(state, x, y, x, y + 1)) {
      ctx.moveTo(sx, sy + em.CONFIG.cell);
      ctx.lineTo(sx + em.CONFIG.cell, sy + em.CONFIG.cell);
    }

    if (em.isBlockedBetween(state, x, y, x - 1, y)) {
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + em.CONFIG.cell);
    }

    if (em.isBlockedBetween(state, x, y, x + 1, y)) {
      ctx.moveTo(sx + em.CONFIG.cell, sy);
      ctx.lineTo(sx + em.CONFIG.cell, sy + em.CONFIG.cell);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawFogVignette(ctx, w, h) {
    const grd = ctx.createRadialGradient(w / 2, h / 2, 70, w / 2, h / 2, Math.max(w, h) * 0.58);
    grd.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grd.addColorStop(0.56, 'rgba(0, 0, 0, 0.13)');
    grd.addColorStop(1, 'rgba(0, 0, 0, 0.76)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }

  function drawCompass(ctx, state, w, h) {
    const obj = state.objective || state.exitPortal;
    if (!obj) return;

    const p = state.player;
    const tx = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    const ty = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    const angle = Math.atan2(ty - p.y, tx - p.x);
    const distCells = Math.hypot(tx - p.x, ty - p.y) / em.CONFIG.cell;
    const x = w / 2;
    const y = h - 48;
    const color = obj.type === 'exit' ? '#8ef7a2' : '#ffe27a';
    const precision = state.player.compassObjective > 0 ? ' precise' : '';

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(4, 8, 13, 0.72)';
    ctx.strokeStyle = em.alphaColor(color, 0.3);
    ctx.lineWidth = 1;
    em.roundedRect(ctx, -138, -23, 276, 46, 8);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 + state.player.compass * 2;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(-9, -10);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d8f3ff';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText(obj.name + ': ' + Math.round(distCells) + precision + ' cells', x, y + 36);
    ctx.restore();
  }

  function drawMinimap(ctx, state, w, h) {
    const compact = w < 760 || h < 620;
    const size = Math.max(148, Math.min(compact ? 212 : em.CONFIG.minimapBase, w * (compact ? 0.35 : 0.28), h - 32));
    const pad = compact ? 10 : 18;
    const x0 = w - size - pad;
    const y0 = pad;
    const range = (compact ? 28 : em.CONFIG.minimapRange) + state.player.minimapBonus * 7;
    const cell = size / (range * 2 + 1);
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const alpha = compact ? 0.58 : 0.80;

    ctx.save();
    ctx.fillStyle = `rgba(4, 8, 13, ${alpha})`;
    em.roundedRect(ctx, x0, y0, size, size, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(125, 249, 255, 0.23)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.clip();

    for (let y = pc.y - range; y <= pc.y + range; y++) {
      for (let x = pc.x - range; x <= pc.x + range; x++) {
        if (!state.revealed.has(em.keyOf(x, y))) continue;

        const mx = x0 + (x - pc.x + range) * cell;
        const my = y0 + (y - pc.y + range) * cell;
        ctx.fillStyle = em.isLitCell(state, x, y) ? 'rgba(125, 249, 255, 0.44)' : 'rgba(90, 120, 140, 0.25)';
        ctx.fillRect(mx, my, Math.ceil(cell), Math.ceil(cell));

        const item = em.itemForCell(state, x, y);
        if (item && (em.isLitCell(state, x, y) || itemPingVisible(state, pc, x, y))) {
          ctx.fillStyle = item.data.color;
          ctx.fillRect(mx + cell * 0.25, my + cell * 0.25, Math.max(2, cell * 0.5), Math.max(2, cell * 0.5));
        }
      }
    }

    drawMinimapWalls(ctx, state, pc, x0, y0, range, cell);
    em.drawMinimapSignal(ctx, state, state.objective, pc, x0, y0, range, cell, '#ffe27a');
    em.drawMinimapSignal(ctx, state, state.exitPortal, pc, x0, y0, range, cell, '#8ef7a2');

    if (state.warden) {
      const wc = em.cellOfWorld(state.warden.x, state.warden.y);
      if (state.revealed.has(em.keyOf(wc.x, wc.y)) || dangerPingVisible(state, pc, wc.x, wc.y)) {
        em.drawMinimapDot(ctx, wc.x - pc.x, wc.y - pc.y, x0, y0, range, cell, '#ff6f9d', 4);
      }
    }

    if (state.enemies && state.player.compassDanger > 0) {
      for (const enemy of state.enemies) {
        const ec = em.cellOfWorld(enemy.x, enemy.y);
        if (dangerPingVisible(state, pc, ec.x, ec.y)) {
          em.drawMinimapDot(ctx, ec.x - pc.x, ec.y - pc.y, x0, y0, range, cell, enemy.color || '#ff6f9d', 3.5);
        }
      }
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x0 + size / 2, y0 + size / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function itemPingVisible(state, pc, x, y) {
    if (state.player.compassItems <= 0) return false;
    return Math.hypot(x - pc.x, y - pc.y) <= 7 + state.player.compassItems * 7;
  }

  function dangerPingVisible(state, pc, x, y) {
    if (state.player.compassDanger <= 0) return false;
    return Math.hypot(x - pc.x, y - pc.y) <= 8 + state.player.compassDanger * 8;
  }

  function drawMinimapWalls(ctx, state, pc, x0, y0, range, cell) {
    const wallWidth = Math.max(1, Math.min(2, cell * 0.42));

    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineWidth = wallWidth;
    ctx.strokeStyle = cell < 3.5 ? 'rgba(190, 232, 245, 0.62)' : 'rgba(190, 232, 245, 0.74)';
    ctx.beginPath();

    for (let y = pc.y - range; y <= pc.y + range; y++) {
      for (let x = pc.x - range; x <= pc.x + range; x++) {
        if (!state.revealed.has(em.keyOf(x, y))) continue;

        const mx = x0 + (x - pc.x + range) * cell;
        const my = y0 + (y - pc.y + range) * cell;

        if (em.isBlockedBetween(state, x, y, x, y - 1)) {
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + cell, my);
        }

        if (em.isBlockedBetween(state, x, y, x + 1, y)) {
          ctx.moveTo(mx + cell, my);
          ctx.lineTo(mx + cell, my + cell);
        }

        if (em.isBlockedBetween(state, x, y, x, y + 1)) {
          ctx.moveTo(mx, my + cell);
          ctx.lineTo(mx + cell, my + cell);
        }

        if (em.isBlockedBetween(state, x, y, x - 1, y)) {
          ctx.moveTo(mx, my);
          ctx.lineTo(mx, my + cell);
        }
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  Object.assign(em, {
    drawVoid,
    drawCellFloor,
    drawCellWalls,
    drawFogVignette,
    drawCompass,
    itemPingVisible,
    dangerPingVisible,
    drawMinimapWalls,
    drawMinimap
  });

  window.EchoMaze = em;
})();
