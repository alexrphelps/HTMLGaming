(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function drawCrumbs(ctx, state, camX, camY) {
    for (const c of state.crumbs) {
      const alpha = Math.max(0, c.ttl / 3.2) * 0.28;
      ctx.fillStyle = `rgba(125, 249, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(c.x - camX, c.y - camY, 2.2, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.fillStyle = em.alphaColor(p.color, alpha);
      ctx.beginPath();
      ctx.arc(p.x - camX, p.y - camY, p.size * alpha, 0, Math.PI * 2);
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
