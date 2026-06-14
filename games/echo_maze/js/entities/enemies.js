(function () {
  'use strict';

  const em = window.EchoMaze || {};

  const ENEMY_DATA = {
    shadow: { label: 'Wandering Shadow', color: '#5a6cff', speed: 42, radius: 12 },
    crawler: { label: 'Wall-Crawler', color: '#8ef7a2', speed: 34, radius: 10 },
    mimic: { label: 'Mimic', color: '#ffb86c', speed: 56, radius: 11 },
    sentry: { label: 'Sentry Eye', color: '#ff6f9d', speed: 0, radius: 13 }
  };

  function spawnAmbientEnemies(state) {
    if (!state.enemies) state.enemies = [];

    const types = ['shadow', 'crawler', 'mimic', 'sentry'];
    const count = Math.min(
      em.CONFIG.enemies.ambientBaseCount + Math.floor(state.anchors / em.CONFIG.enemies.ambientAnchorDivisor),
      em.CONFIG.enemies.ambientMaxCount
    );
    const pc = em.cellOfWorld(state.player.x, state.player.y);

    for (let i = 0; i < count; i++) {
      const type = types[(state.anchors + i + Math.floor(state.danger * 8)) % types.length];
      const cell = findEnemySpawnCell(
        state,
        pc,
        i,
        em.CONFIG.enemies.ambientBaseDistance + state.anchors * em.CONFIG.enemies.ambientAnchorDistance + i * em.CONFIG.enemies.ambientIndexDistance
      );
      state.enemies.push(createEnemy(state, type, cell, i));
    }

    trimEnemies(state);
  }

  function maybeSpawnDangerEnemy(state, dt) {
    if (!state.enemies) state.enemies = [];
    state.enemySpawnClock -= dt;
    if (state.enemySpawnClock > 0 || state.danger < em.CONFIG.enemies.dangerSpawnThreshold) return;

    state.enemySpawnClock = Math.max(em.CONFIG.enemies.dangerSpawnMinDelay, em.CONFIG.enemies.dangerSpawnBaseDelay - state.danger * em.CONFIG.enemies.dangerSpawnDelayScale);
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const type = state.danger > 0.76 ? 'sentry' : 'shadow';
    const cell = findEnemySpawnCell(state, pc, state.enemies.length + 3, em.CONFIG.enemies.dangerSpawnBaseDistance + state.anchors * em.CONFIG.enemies.dangerSpawnAnchorDistance);
    state.enemies.push(createEnemy(state, type, cell, state.enemies.length));
    trimEnemies(state);
  }

  function createEnemy(state, type, cell, index) {
    const data = ENEMY_DATA[type];
    return {
      id: type + '-' + state.anchors + '-' + index + '-' + em.keyOf(cell.x, cell.y),
      type,
      label: data.label,
      color: data.color,
      x: cell.x * em.CONFIG.cell + em.CONFIG.cell / 2,
      y: cell.y * em.CONFIG.cell + em.CONFIG.cell / 2,
      cellX: cell.x,
      cellY: cell.y,
      speed: data.speed,
      radius: data.radius,
      path: [],
      pathTimer: 0,
      damageCooldown: 0,
      awake: type !== 'mimic',
      alert: 0,
      patrolSeed: em.hash32(state, cell.x, cell.y, 17171 + index)
    };
  }

  function findEnemySpawnCell(state, origin, index, preferredDistance) {
    const candidates = [];

    for (let i = 0; i < em.CONFIG.enemies.spawnAttempts; i++) {
      const angle = em.rand01(state, state.anchors + index, i, 18181) * Math.PI * 2;
      const dist = preferredDistance + Math.floor((em.rand01(state, index, i, 18182) - 0.5) * em.CONFIG.enemies.spawnDistanceJitter);
      const x = Math.round(origin.x + Math.cos(angle) * dist);
      const y = Math.round(origin.y + Math.sin(angle) * dist);
      const path = em.findPath(state, origin, { x, y }, em.CONFIG.pathLimit);
      if (path && path.length > em.CONFIG.enemies.minSpawnPathLength) candidates.push({ x, y, score: Math.abs(path.length - preferredDistance) });
    }

    candidates.sort((a, b) => a.score - b.score);
    if (candidates.length) return candidates[0];
    return em.findReachableCell(state, origin, preferredDistance);
  }

  function updateEnemies(state, dt, playerCell) {
    if (!state.enemies) return;
    maybeSpawnDangerEnemy(state, dt);

    for (const enemy of state.enemies) {
      enemy.damageCooldown = Math.max(0, enemy.damageCooldown - dt);
      enemy.alert = Math.max(0, enemy.alert - dt);
      enemy.cellX = Math.floor(enemy.x / em.CONFIG.cell);
      enemy.cellY = Math.floor(enemy.y / em.CONFIG.cell);

      if (enemy.type === 'sentry') updateSentry(state, enemy, dt, playerCell);
      else updateMobileEnemy(state, enemy, dt, playerCell);

      const dist = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
      if (dist < state.player.r + enemy.radius && enemy.damageCooldown <= 0 && enemy.awake !== false) {
        enemy.damageCooldown = em.CONFIG.enemies.damageCooldown;
        enemy.alert = em.CONFIG.enemies.alertDuration;
        em.damagePlayer(state);
      }
    }
  }

  function updateMobileEnemy(state, enemy, dt, playerCell) {
    const distToPlayer = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);

    if (enemy.type === 'mimic' && !enemy.awake) {
      if (distToPlayer < em.CONFIG.cell * em.CONFIG.enemies.mimicWakeCells) {
        enemy.awake = true;
        enemy.alert = 5;
        em.addFloatingText(state, 'Mimic!', enemy.x, enemy.y - 20, enemy.color);
        em.addDangerSmoke(state, enemy.x, enemy.y, 8);
      } else {
        return;
      }
    }

    enemy.pathTimer -= dt;
    const start = { x: enemy.cellX, y: enemy.cellY };
    const target = enemyTargetCell(state, enemy, playerCell);

    if (enemy.pathTimer <= 0 || !enemy.path.length) {
      enemy.pathTimer = enemy.type === 'crawler' ? 0.75 : 0.55;
      enemy.path = em.findPath(state, start, target, em.CONFIG.enemies.mobilePathLimit) || em.fallbackWardenStep(state, start, target);
    }

    const next = enemy.path[1] || target;
    const tx = next.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    const ty = next.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dangerBoost = 1 + state.danger * 0.22;
    const speed = enemy.speed * dangerBoost * (enemy.type === 'mimic' && enemy.alert > 0 ? 1.18 : 1);

    enemy.x += (dx / dist) * speed * dt;
    enemy.y += (dy / dist) * speed * dt;
  }

  function enemyTargetCell(state, enemy, playerCell) {
    if (enemy.type === 'shadow' || enemy.type === 'mimic') return playerCell;
    if (enemy.type === 'crawler' && hasAdjacentWall(state, playerCell.x, playerCell.y)) return playerCell;

    const step = (enemy.patrolSeed % 7) + 6;
    return {
      x: enemy.cellX + ((enemy.patrolSeed % 3) - 1) * step,
      y: enemy.cellY + (((enemy.patrolSeed >> 3) % 3) - 1) * step
    };
  }

  function updateSentry(state, enemy, dt, playerCell) {
    if (hasLineOfSight(state, { x: enemy.cellX, y: enemy.cellY }, playerCell, em.CONFIG.enemies.sentryBaseRange + state.player.compassDanger * em.CONFIG.enemies.sentryCompassRange)) {
      enemy.alert = 1.5;
      em.raiseDanger(state, dt * 0.18);
      if (state.dangerPulse <= 0.1) em.addDangerSmoke(state, enemy.x, enemy.y, 4);
    }
  }

  function hasAdjacentWall(state, x, y) {
    return em.DIRS.some(dir => em.isBlockedBetween(state, x, y, x + em.VEC[dir].x, y + em.VEC[dir].y));
  }

  function hasLineOfSight(state, a, b, range) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx !== 0 && dy !== 0) return false;
    if (Math.abs(dx) + Math.abs(dy) > range) return false;

    const dir = dx > 0 ? 'E' : dx < 0 ? 'W' : dy > 0 ? 'S' : 'N';
    let x = a.x;
    let y = a.y;

    while (x !== b.x || y !== b.y) {
      const nx = x + em.VEC[dir].x;
      const ny = y + em.VEC[dir].y;
      if (em.isBlockedBetween(state, x, y, nx, ny)) return false;
      x = nx;
      y = ny;
    }

    return true;
  }

  function trimEnemies(state) {
    const max = em.CONFIG.enemies.maxBaseCount + state.anchors * em.CONFIG.enemies.maxPerAnchor;
    if (state.enemies.length > max) state.enemies.splice(0, state.enemies.length - max);
  }

  function enemyAtCell(state, x, y, type) {
    if (!state.enemies) return null;
    return state.enemies.find(enemy => {
      if (type && enemy.type !== type) return false;
      return Math.floor(enemy.x / em.CONFIG.cell) === x && Math.floor(enemy.y / em.CONFIG.cell) === y;
    }) || null;
  }

  Object.assign(em, {
    ENEMY_DATA,
    spawnAmbientEnemies,
    maybeSpawnDangerEnemy,
    createEnemy,
    findEnemySpawnCell,
    updateEnemies,
    updateMobileEnemy,
    updateSentry,
    hasLineOfSight,
    enemyAtCell
  });
  window.EchoMaze = em;
})();
