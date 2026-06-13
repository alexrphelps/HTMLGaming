(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function drawItems(ctx, state, minX, maxX, minY, maxY, camX, camY) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!state.revealed.has(em.keyOf(x, y))) continue;
        const item = em.itemForCell(state, x, y);
        if (item) drawItem(ctx, state, x, y, item, camX, camY);
      }
    }
  }

  function drawItem(ctx, state, x, y, item, camX, camY) {
    const lit = em.isLitCell(state, x, y);
    const cx = x * em.CONFIG.cell + em.CONFIG.cell / 2 - camX;
    const cy = y * em.CONFIG.cell + em.CONFIG.cell / 2 - camY;
    const wobble = Math.sin(state.time * 4 + em.hash32(state, x, y, 111) * 0.001) * 2;
    const color = item.data.color;

    ctx.save();
    ctx.globalAlpha = lit ? 1 : 0.42;
    ctx.translate(cx, cy + wobble);
    ctx.shadowColor = color;
    ctx.shadowBlur = lit ? 16 : 4;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    if (item.type === 'lantern') {
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();
    } else if (item.type === 'boots') {
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(12, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
    } else if (item.type === 'phase') {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14);
    } else if (item.type === 'compass') {
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
    } else if (item.type === 'map') {
      ctx.strokeRect(-9, -8, 18, 16);
      ctx.beginPath();
      ctx.moveTo(-3, -8);
      ctx.lineTo(-3, 8);
      ctx.moveTo(4, -8);
      ctx.lineTo(4, 8);
      ctx.stroke();
    } else if (item.type === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, -6);
      ctx.lineTo(7, 9);
      ctx.lineTo(0, 13);
      ctx.lineTo(-7, 9);
      ctx.lineTo(-10, -6);
      ctx.closePath();
      ctx.fill();
    } else if (item.type === 'battery') {
      ctx.fillRect(-7, -11, 14, 22);
      ctx.fillRect(-3, -15, 6, 4);
    } else {
      drawStar(ctx, 0, 0, 6, 13, 5);
    }

    ctx.restore();
  }

  function drawObjective(ctx, state, camX, camY) {
    const obj = state.objective;
    if (!obj || !state.revealed.has(em.keyOf(obj.x, obj.y))) return;

    const cx = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2 - camX;
    const cy = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2 - camY;
    const lit = em.isLitCell(state, obj.x, obj.y);
    const pulse = 1 + Math.sin(state.time * 3.5) * 0.08;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = lit ? 1 : 0.58;
    ctx.shadowColor = '#ffe27a';
    ctx.shadowBlur = lit ? 30 : 12;
    ctx.strokeStyle = '#ffe27a';
    ctx.fillStyle = 'rgba(255, 226, 122, 0.16)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe27a';
    ctx.fillRect(-4, -15, 8, 30);
    ctx.fillRect(-15, -4, 30, 8);
    ctx.restore();
  }

  function drawExitPortal(ctx, state, camX, camY) {
    const obj = state.exitPortal;
    if (!obj || !state.revealed.has(em.keyOf(obj.x, obj.y))) return;

    const cx = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2 - camX;
    const cy = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2 - camY;
    const spin = state.time * 1.8;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin);
    ctx.shadowColor = '#8ef7a2';
    ctx.shadowBlur = 28;
    ctx.strokeStyle = '#8ef7a2';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.rotate(-spin * 1.8);
    ctx.strokeStyle = '#7df9ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawWarden(ctx, state, camX, camY) {
    const w = state.warden;
    if (!w) return;

    const wc = em.cellOfWorld(w.x, w.y);
    const revealed = state.revealed.has(em.keyOf(wc.x, wc.y));
    const near = Math.hypot(w.x - state.player.x, w.y - state.player.y) < em.CONFIG.cell * 7;
    if (!revealed && !near) return;

    const sx = w.x - camX;
    const sy = w.y - camY;
    const wakeAlpha = w.wake > 0 ? 0.45 : 1;
    const pulse = 1 + Math.sin(state.time * 5) * 0.08;

    ctx.save();
    ctx.globalAlpha = wakeAlpha;
    ctx.translate(sx, sy);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = '#ff6f9d';
    ctx.shadowBlur = 26;
    ctx.fillStyle = 'rgba(255, 111, 157, 0.82)';
    ctx.strokeStyle = '#ffd7e3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#21040d';
    ctx.beginPath();
    ctx.arc(-5, -3, 3, 0, Math.PI * 2);
    ctx.arc(5, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(ctx, state, sx, sy) {
    const p = state.player;
    const phased = p.phaseTimer > 0;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(p.angle);
    ctx.shadowColor = phased ? '#bd8cff' : '#7df9ff';
    ctx.shadowBlur = phased ? 24 : 16;
    ctx.fillStyle = phased ? 'rgba(189, 140, 255, 0.95)' : 'rgba(216, 243, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = phased ? '#ffffff' : '#03111a';
    ctx.beginPath();
    ctx.moveTo(p.r + 9, 0);
    ctx.lineTo(p.r - 1, -5);
    ctx.lineTo(p.r - 1, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (phased) {
      ctx.strokeStyle = 'rgba(189, 140, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, p.r + 8 + Math.sin(state.time * 15) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawMinimapSignal(ctx, state, obj, pc, x0, y0, range, cell, color) {
    if (!obj || !em.isKnownSignal(state, obj)) return;
    drawMinimapDot(ctx, obj.x - pc.x, obj.y - pc.y, x0, y0, range, cell, color, 5);
  }

  function drawMinimapDot(ctx, dx, dy, x0, y0, range, cell, color, radius) {
    if (Math.abs(dx) > range || Math.abs(dy) > range) return;

    const ox = x0 + (dx + range + 0.5) * cell;
    const oy = y0 + (dy + range + 0.5) * cell;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ox, oy, Math.max(radius, cell * 0.9), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawStar(ctx, cx, cy, inner, outer, points) {
    ctx.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / points;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
  }

  Object.assign(em, {
    drawItems,
    drawItem,
    drawObjective,
    drawExitPortal,
    drawWarden,
    drawPlayer,
    drawMinimapSignal,
    drawMinimapDot,
    drawStar
  });

  window.EchoMaze = em;
})();
