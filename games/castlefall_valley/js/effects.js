  function showMessage(text) {
    state.messageText = text;
    state.messageTimer = 2.2;
    const el = document.getElementById("message");
    el.textContent = text;
    el.classList.add("show");
  }

  function addFloatText(x, y, text, color = "#fff") {
    state.floatTexts.push({
      x,
      y,
      text,
      color,
      life: 1,
      vy: -22
    });
  }

  function particle(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      state.particles.push({
        x,
        y,
        vx: rand(-55, 55),
        vy: rand(-95, -25),
        life: rand(0.35, 0.8),
        max: 0.8,
        size: rand(2, 5),
        color
      });
    }
  }

  function updateParticles(dt) {
    for (const p of state.particles) {
      p.life -= dt;
      p.vy += 170 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);

    for (const f of state.floatTexts) {
      f.life -= dt;
      f.y += f.vy * dt;
    }
    state.floatTexts = state.floatTexts.filter(f => f.life > 0);
  }

Object.assign(window.CastlefallValley, { showMessage, addFloatText, particle, updateParticles });
