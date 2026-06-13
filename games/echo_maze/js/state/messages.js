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

  function addDangerSmoke(state, x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (em.rand01(state, i, Math.floor(x), 9500) - 0.5) * Math.PI;
      const spd = 14 + em.rand01(state, Math.floor(y), i, 9501) * 36;
      state.particles.push({
        kind: 'smoke',
        x: x + (em.rand01(state, i, Math.floor(y), 9502) - 0.5) * 24,
        y: y + (em.rand01(state, i, Math.floor(x), 9503) - 0.5) * 18,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 8 + em.rand01(state, i, Math.floor(x), 9504) * 10,
        ttl: 1.1 + em.rand01(state, i, Math.floor(y), 9505) * 0.75,
        maxTtl: 1.85,
        color: '#ff6f9d'
      });
    }
  }

  function addAmbientMote(state) {
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const biome = em.biomeForCell ? em.biomeForCell(state, pc.x, pc.y) : { accent: '#7df9ff', moteRate: 0.1 };
    if (em.rand01(state, pc.x, pc.y, 9600 + Math.floor(state.time * 10)) > biome.moteRate) return;

    const a = em.rand01(state, pc.x, pc.y, 9601 + Math.floor(state.time * 7)) * Math.PI * 2;
    const d = em.CONFIG.cell * (2 + em.rand01(state, pc.y, pc.x, 9602 + Math.floor(state.time * 5)) * 5);
    state.particles.push({
      kind: 'mote',
      x: state.player.x + Math.cos(a) * d,
      y: state.player.y + Math.sin(a) * d,
      vx: Math.cos(a + Math.PI) * 8,
      vy: Math.sin(a + Math.PI) * 8,
      size: 1.4,
      ttl: 1.4,
      maxTtl: 1.4,
      color: biome.accent
    });
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
    addDangerSmoke,
    addAmbientMote,
    revealAround,
    revealPathBurst,
    tickMessages,
    tickVisuals
  });

  window.EchoMaze = em;
})();
