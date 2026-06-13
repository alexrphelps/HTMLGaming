(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function drawCrumbs(ctx, state, camX, camY) {
    for (const c of state.crumbs) {
      const alpha = Math.max(0, c.ttl / c.maxTtl) * 0.34;
      const sx = c.x - camX;
      const sy = c.y - camY;
      ctx.fillStyle = `rgba(125, 249, 255, ${alpha})`;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(c.angle || 0);
      ctx.shadowColor = '#7df9ff';
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.ellipse(-2.5, 0, 2.2, 5.2, 0, 0, Math.PI * 2);
      ctx.ellipse(3.5, 0, 2.2, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPulses(ctx, state, camX, camY) {
    for (const pulse of state.pulses) {
      const alpha = Math.max(0, pulse.ttl / pulse.maxTtl);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = pulse.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = pulse.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(pulse.x - camX, pulse.y - camY, pulse.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles(ctx, state, camX, camY) {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.ttl / p.maxTtl);
      ctx.fillStyle = em.alphaColor(p.color, p.kind === 'smoke' ? alpha * 0.28 : alpha);
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.kind === 'smoke' ? p.size * (1.2 - alpha * 0.4) : p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFloatingText(ctx, state, camX, camY) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 14px ui-sans-serif, system-ui';

    for (const f of state.floating) {
      const alpha = Math.max(0, f.ttl / f.maxTtl);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 12;
      ctx.fillText(f.text, f.x - camX, f.y - camY);
    }

    ctx.restore();
  }

  function drawScreenPulse(ctx, state, w, h) {
    if (state.screenPulse <= 0) return;
    ctx.fillStyle = `rgba(125, 249, 255, ${state.screenPulse * 0.10})`;
    ctx.fillRect(0, 0, w, h);
  }

  Object.assign(em, {
    drawCrumbs,
    drawPulses,
    drawParticles,
    drawFloatingText,
    drawScreenPulse
  });

  window.EchoMaze = em;
})();
