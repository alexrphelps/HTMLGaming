  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  Object.assign(window.CastlefallValley, { canvas, ctx });

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = Math.floor(state.w * dpr);
    canvas.height = Math.floor(state.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

window.addEventListener("resize", resize);
resize();

  function loop(now) {
    const rawDt = (now - state.last) / 1000;
    state.last = now;
    const dt = Math.min(0.033, rawDt);
    state.dt = dt;

    window.CastlefallValley.update(dt);
    window.CastlefallValley.render();

    requestAnimationFrame(loop);
  }

  // FUTURE FEATURE: Add destructible barricades on each flat battlefield layer.
  // FUTURE FEATURE: Add siege rams that require shield units nearby to survive uphill pushes.
  // FUTURE FEATURE: Add commander personalities for enemy AI: cautious, swarm, cavalry, archer-heavy.
  // FUTURE FEATURE: Add a second playable hero class: Valley Ranger with slope-based arrow bonuses.
  // FUTURE FEATURE: Replace geometric troops with sprite-sheet animations and directional frames.
  // FUTURE FEATURE: Add weather events: fog lowers archer range, rain slows uphill charges, wind bends arrows.
  // FUTURE FEATURE: Add base building placement zones behind the castle instead of instant upgrade buttons.
  // FUTURE FEATURE: Add morale break moments where enemy troops retreat if their castle takes heavy damage.
  // FUTURE FEATURE: Add campaign progression with persistent castle upgrades.
  // FUTURE FEATURE: Add a smart unit-card cooldown system to prevent spam and encourage timed waves.

window.CastlefallValley.setupControlLabels();
window.CastlefallValley.setupInput();
window.CastlefallValley.reset();
requestAnimationFrame(loop);
