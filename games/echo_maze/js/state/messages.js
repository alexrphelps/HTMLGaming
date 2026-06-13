(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function addMessage(state, text) {
    state.messages.unshift({ text, ttl: 5.7 });
    state.messages = state.messages.slice(0, 5);
  }

  function addFloatingText(state, text, x, y, color) {
    state.floating.push({ text, x, y, vy: -24, ttl: 1.05, maxTtl: 1.05, color });
  }

  function addPulse(state, x, y, max, ttl, color) {
    state.pulses.push({ x, y, radius: 0, max, ttl, maxTtl: ttl, color });
  }

  function addParticles(state, x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      const a = em.rand01(state, Math.floor(x), i, 9100 + state.items) * Math.PI * 2;
      const spd = 35 + em.rand01(state, Math.floor(y), i, 9200 + state.anchors) * 125;
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2 + em.rand01(state, i, Math.floor(x), 9300) * 3,
        ttl: 0.55 + em.rand01(state, i, Math.floor(y), 9400) * 0.35,
        maxTtl: 0.9,
        color
      });
    }
  }

  function revealAround(state, cx, cy, radius) {
    const r = Math.ceil(radius);

    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;

        if (Math.hypot(dx, dy) <= radius) {
          state.revealed.add(em.keyOf(x, y));
        }
      }
    }
  }

  function revealPathBurst(state, cx, cy, radius) {
    revealAround(state, cx, cy, radius);

    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (em.rand01(state, x, y, 8181) < 0.18) state.revealed.add(em.keyOf(x, y));
      }
    }
  }

  function tickMessages(state, dt) {
    for (const msg of state.messages) msg.ttl -= dt;
    state.messages = state.messages.filter(m => m.ttl > 0);
  }

  function tickVisuals(state, dt) {
    state.screenPulse = Math.max(0, state.screenPulse - dt * 1.8);
    state.screenShake = Math.max(0, state.screenShake - dt * 16);

    for (const pulse of state.pulses) {
      pulse.ttl -= dt;
      const t = 1 - Math.max(0, pulse.ttl) / pulse.maxTtl;
      pulse.radius = pulse.max * em.easeOutCubic(t);
    }
    state.pulses = state.pulses.filter(pulse => pulse.ttl > 0);

    for (const f of state.floating) {
      f.ttl -= dt;
      f.y += f.vy * dt;
    }
    state.floating = state.floating.filter(f => f.ttl > 0);

    for (const p of state.particles) {
      p.ttl -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.04, dt);
      p.vy *= Math.pow(0.04, dt);
    }
    state.particles = state.particles.filter(p => p.ttl > 0);
  }

  Object.assign(em, {
    addMessage,
    addFloatingText,
    addPulse,
    addParticles,
    revealAround,
    revealPathBurst,
    tickMessages,
    tickVisuals
  });

  window.EchoMaze = em;
})();
