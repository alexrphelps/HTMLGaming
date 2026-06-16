(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function spawnWarden(state) {
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const cell = em.findReachableCell(state, pc, 22);
    state.warden = {
      x: cell.x * em.CONFIG.cell + em.CONFIG.cell / 2,
      y: cell.y * em.CONFIG.cell + em.CONFIG.cell / 2,
      cellX: cell.x,
      cellY: cell.y,
      speed: 48,
      wake: em.CONFIG.wardenStartDelay,
      damageCooldown: 0,
      pathTimer: 0,
      path: []
    };
    em.addMessage(state, 'A Maze Warden heard the Anchor. Keep moving.');
  }

  function updateWarden(state, dt, playerCell) {
    const w = state.warden;
    if (!w) return;

    w.wake = Math.max(0, w.wake - dt);
    w.damageCooldown = Math.max(0, w.damageCooldown - dt);
    if (w.wake > 0) return;

    w.pathTimer -= dt;
    w.cellX = Math.floor(w.x / em.CONFIG.cell);
    w.cellY = Math.floor(w.y / em.CONFIG.cell);

    if (w.pathTimer <= 0 || !w.path.length) {
      w.pathTimer = 0.55;
      w.path = em.findPath(state, { x: w.cellX, y: w.cellY }, playerCell, em.CONFIG.pathLimit) ||
        em.fallbackWardenStep(state, { x: w.cellX, y: w.cellY }, playerCell);
    }

    const next = w.path[1] || playerCell;
    const tx = next.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    const ty = next.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    const dx = tx - w.x;
    const dy = ty - w.y;
    const dist = Math.hypot(dx, dy) || 1;
    const batterySlow = 1 - Math.min(0.34, state.player.battery * 0.055);
    const tierBoost = 1 + state.anchors * 0.075;
    const speed = w.speed * tierBoost * batterySlow;

    w.x += (dx / dist) * speed * dt;
    w.y += (dy / dist) * speed * dt;

    const playerDist = Math.hypot(w.x - state.player.x, w.y - state.player.y);

    if (playerDist < state.player.r + 14 && w.damageCooldown <= 0) {
      w.damageCooldown = em.CONFIG.wardenDamageCooldown;
      damagePlayer(state, 'Maze Warden', 1 + (state.danger > 0.82 ? 1 : 0));
    }
  }

  function damagePlayer(state, sourceLabel = 'Danger', amount = 1) {
    const p = state.player;
    let remaining = Math.max(1, amount);
    let cracked = 0;
    let healthLost = 0;

    while (remaining > 0 && (p.shields > 0 || p.health > 0)) {
      if (p.shields > 0) {
        p.shields--;
        cracked++;
      } else {
        p.health--;
        healthLost++;
      }
      remaining--;
    }

    if (cracked > 0 && healthLost <= 0) {
      em.addMessage(state, 'Ward Shield cracked. ' + sourceLabel + ' recoils.');
    } else {
      em.addMessage(state, sourceLabel + ' strikes. Echo integrity failing.');
    }

    state.screenShake = 10;
    state.screenPulse = 0.75;
    em.addPulse(state, p.x, p.y, em.CONFIG.cell * 3.4, 0.55, '#ff4e38');
    em.addParticles(state, p.x, p.y, '#ff4e38', 22);
  }

  Object.assign(em, { spawnWarden, updateWarden, damagePlayer });
  window.EchoMaze = em;
})();
