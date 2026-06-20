(function(D) {
  with (D) {
  const VOLATILE_LIMITS = {
    bullets: 420,
    enemyBullets: 360,
    particles: 520,
    damageTexts: 90,
    hazards: 120,
    mines: 80,
    pickups: 160,
  };

  function trimVolatileArray(arr, limit) {
    if (!arr || arr.length <= limit) return;
    arr.splice(0, arr.length - limit);
  }

  function capVolatileArrays() {
    if (!game) return;
    trimVolatileArray(game.bullets, VOLATILE_LIMITS.bullets);
    trimVolatileArray(game.enemyBullets, VOLATILE_LIMITS.enemyBullets);
    trimVolatileArray(game.particles, VOLATILE_LIMITS.particles);
    trimVolatileArray(game.damageTexts, VOLATILE_LIMITS.damageTexts);
    trimVolatileArray(game.hazards, VOLATILE_LIMITS.hazards);
    trimVolatileArray(game.mines, VOLATILE_LIMITS.mines);
    trimVolatileArray(game.pickups, VOLATILE_LIMITS.pickups);
  }

  function clearRoomCombatEffects() {
    if (!game) return;
    game.bullets.length = 0;
    game.enemyBullets.length = 0;
    game.mines.length = 0;
    game.hazards = game.hazards.filter(h => h.type === "mirror");
    capVolatileArrays();
  }

  function updatePausedCleanup(dt) {
    updateParticles(dt);
    updateNotifications(dt);
    updateDamageTexts(dt);
    const room = currentRoom();
    if (room && room.cleared) clearRoomCombatEffects();
    capVolatileArrays();
  }

  function update(dt) {
    if (!game || !game.started || game.over) return;
    if (game.paused) {
      updatePausedCleanup(dt);
      return;
    }
    game.time += dt;
    const p = game.player;
    p.interactCd = Math.max(0, p.interactCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.qCd = Math.max(0, p.qCd - dt);
    p.eCd = Math.max(0, p.eCd - dt);
    game.cameraShake = Math.max(0, game.cameraShake - dt * 20);
    game.flash = Math.max(0, game.flash - dt);

    updateMouseLocal();
    updatePlayer(dt);
    updateShooting(dt);
    updateAbilities(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateHazards(dt);
    updateTech(dt);
    updatePickups(dt);
    updateParticles(dt);
    updateRoomCompletion();
    updateTransitions(dt);
    updateNotifications(dt);
    updateDamageTexts(dt);
    capVolatileArrays();
    justPressed.clear();
  }

  function updateMouseLocal() {
    const scaleX = canvas.clientWidth / canvas.width * devicePixelRatio;
    const scaleY = canvas.clientHeight / canvas.height * devicePixelRatio;
    game.offsetX = (canvas.clientWidth - ROOM_W) / 2;
    game.offsetY = (canvas.clientHeight - ROOM_H) / 2;
    mouse.worldX = mouse.x - game.offsetX;
    mouse.worldY = mouse.y - game.offsetY;
    game.mouseLocalX = clamp(mouse.worldX, 0, ROOM_W);
    game.mouseLocalY = clamp(mouse.worldY, 0, ROOM_H);
  }

  function updatePlayer(dt) {
    const p = game.player;
    let mx = 0, my = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) my--;
    if (keys.has("KeyS") || keys.has("ArrowDown")) my++;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) mx--;
    if (keys.has("KeyD") || keys.has("ArrowRight")) mx++;
    const len = Math.hypot(mx, my) || 1;
    mx /= len; my /= len;

    if (justPressed.has("Space") && p.dashCd <= 0) {
      p.dashTime = 0.14;
      p.dashCd = Math.max(.22, .72 - p.dashCharges * .06);
      p.invuln = Math.max(p.invuln, 0.16 + p.stats.dashIFrames);
      const dashSpeed = 680;
      p.vx = mx * dashSpeed || Math.cos(angleTo(p.x, p.y, game.mouseLocalX, game.mouseLocalY)) * dashSpeed;
      p.vy = my * dashSpeed || Math.sin(angleTo(p.x, p.y, game.mouseLocalX, game.mouseLocalY)) * dashSpeed;
      if (p.stats.dashReload) p.shootTimer = 0;
      if (p.stats.mines) dropMine(p.x, p.y);
      burst(p.x, p.y, 16, "#7df9ff", 180);
      tone(220, .045, "sawtooth", .028);
    }

    if (p.dashTime > 0) {
      p.dashTime -= dt;
      moveEntity(p, p.vx * dt, p.vy * dt, true);
      if (p.stats.dashDamage > 0) {
        for (const e of game.enemies) {
          if (dist(p.x, p.y, e.x, e.y) < p.r + e.r + 8) damageEnemy(e, p.stats.dashDamage * p.stats.damage, "dash");
        }
      }
    } else {
      const speed = 215 * p.stats.moveSpeed;
      p.vx = lerp(p.vx, mx * speed, 0.25);
      p.vy = lerp(p.vy, my * speed, 0.25);
      moveEntity(p, p.vx * dt, p.vy * dt, true);
    }

    if (justPressed.has("KeyF")) tryInteract();
    if (justPressed.has("Tab")) showCodex();
  }

  function moveEntity(ent, dx, dy, collideWalls = true) {
    ent.x += dx;
    if (collideWalls) resolveWalls(ent, "x");
    ent.y += dy;
    if (collideWalls) resolveWalls(ent, "y");
    ent.x = clamp(ent.x, ent.r + 8, ROOM_W - ent.r - 8);
    ent.y = clamp(ent.y, ent.r + 8, ROOM_H - ent.r - 8);
  }

  function resolveWalls(ent, axis) {
    const room = currentRoom();
    if (!room) return;
    for (const o of room.obstacles) {
      if (circleRect(ent.x, ent.y, ent.r, o.x, o.y, o.w, o.h)) {
        if (axis === "x") {
          if (ent.x < o.x + o.w / 2) ent.x = o.x - ent.r;
          else ent.x = o.x + o.w + ent.r;
        } else {
          if (ent.y < o.y + o.h / 2) ent.y = o.y - ent.r;
          else ent.y = o.y + o.h + ent.r;
        }
      }
    }
  }

  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < cr * cr;
  }

  function nearestInteractable() {
    const room = currentRoom();
    if (!room) return null;
    let best = null, bd = 999;
    for (const obj of room.interactables) {
      if (obj.used && obj.type !== "lore") continue;
      const d = dist(game.player.x, game.player.y, obj.x, obj.y);
      if (d < obj.r + 42 && d < bd) { best = obj; bd = d; }
    }
    return best;
  }

  function tryInteract() {
    if (!game || game.paused || game.over) return false;
    const obj = nearestInteractable();
    if (!obj) return false;
    interactWith(obj);
    return true;
  }

  function updateShooting(dt) {
    const p = game.player;
    p.shootTimer -= dt;
    const every = 0.18 / p.stats.fireRate;
    if (mouse.down && p.shootTimer <= 0) {
      p.shootTimer = every;
      firePlayerShot(p.x, p.y, angleTo(p.x, p.y, game.mouseLocalX, game.mouseLocalY));
      tone(520 + Math.random()*80, .025, "square", .018);
    }
  }

  function firePlayerShot(x, y, ang, source = "player", damageMul = 1) {
    const p = game.player;
    const count = p.stats.projectiles;
    const spread = p.stats.spread + (count > 1 ? .08 : 0);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i - (count - 1) / 2) / ((count - 1) / 2 || 1);
      const a = ang + t * spread;
      createPlayerBullet(x + Math.cos(a) * 18, y + Math.sin(a) * 18, a, damageMul, source);
    }
    if (p.stats.backShot && source === "player") {
      createPlayerBullet(x - Math.cos(ang) * 18, y - Math.sin(ang) * 18, ang + Math.PI, .55, "ghost");
    }
  }

  function createPlayerBullet(x, y, a, damageMul = 1, source = "player") {
    const p = game.player;
    let dmg = 2.35 * p.stats.damage * damageMul;
    let crit = false;
    if (game.rng() < p.stats.crit) { crit = true; dmg *= p.stats.critDamage; }
    game.bullets.push({
      x, y,
      vx: Math.cos(a) * 620 * p.stats.bulletSpeed,
      vy: Math.sin(a) * 620 * p.stats.bulletSpeed,
      r: 5.5 * p.stats.bulletSize * (crit ? 1.25 : 1),
      damage: dmg,
      life: 1.25,
      pierce: p.stats.pierce,
      bounce: p.stats.ricochet,
      split: p.stats.split,
      wallSplit: p.stats.wallSplit,
      homing: p.stats.homing,
      crit,
      source,
      burn: p.stats.burn,
      poison: p.stats.poison,
      freeze: p.stats.freeze,
      lightning: p.stats.lightning,
      explosive: p.stats.explosive,
      color: crit ? "#fff2a8" : source === "ghost" ? "#c084fc" : "#7df9ff",
    });
    trimVolatileArray(game.bullets, VOLATILE_LIMITS.bullets);
  }

  function updateAbilities(dt) {
    const p = game.player;
    if (justPressed.has("KeyQ") && p.qCd <= 0 && p.abilities.q) {
      useAbility(p.abilities.q);
    }
    if (justPressed.has("KeyE") && p.eCd <= 0 && p.abilities.e) {
      useAbility(p.abilities.e);
    }
  }

  function useAbility(name) {
    const p = game.player;
    const a = angleTo(p.x, p.y, game.mouseLocalX, game.mouseLocalY);
    if (name === "Grenade" || name === "Cluster Grenade") {
      p.qCd = name === "Cluster Grenade" ? 3.6 : 5.2;
      const gx = p.x + Math.cos(a) * 58;
      const gy = p.y + Math.sin(a) * 58;
      setTimeout(() => explode(gx + Math.cos(a) * 110, gy + Math.sin(a) * 110, name === "Cluster Grenade" ? 82 : 62, 9 * p.stats.damage, true), 140);
      if (name === "Cluster Grenade") {
        for (let i = -1; i <= 1; i += 2) setTimeout(() => explode(gx + Math.cos(a+i*.45) * 90, gy + Math.sin(a+i*.45) * 90, 48, 5 * p.stats.damage, true), 260);
      }
      tone(130, .09, "sawtooth", .04);
    } else if (name === "Blink") {
      p.eCd = 4.2;
      burst(p.x, p.y, 22, "#7df9ff", 200);
      p.x = clamp(p.x + Math.cos(a) * 190, p.r + 12, ROOM_W - p.r - 12);
      p.y = clamp(p.y + Math.sin(a) * 190, p.r + 12, ROOM_H - p.r - 12);
      p.invuln = Math.max(p.invuln, .25);
      burst(p.x, p.y, 22, "#7df9ff", 200);
      tone(760, .08, "triangle", .035);
    } else if (name === "Black Hole") {
      p.eCd = 7.5;
      game.hazards.push({ type: "blackHole", x: game.mouseLocalX, y: game.mouseLocalY, r: 22, maxR: 105, ttl: 3.1, pulse: 0, dmg: 2.2 * p.stats.damage });
      trimVolatileArray(game.hazards, VOLATILE_LIMITS.hazards);
      tone(90, .18, "sawtooth", .05);
    } else if (name === "Ice Nova") {
      p.eCd = 6.2;
      for (const e of game.enemies) {
        const d = dist(p.x, p.y, e.x, e.y);
        if (d < 170) { e.status.freeze = Math.max(e.status.freeze, 2.2); damageEnemy(e, 3.5 * p.stats.damage, "ice"); }
      }
      burst(p.x, p.y, 48, "#8bd3ff", 240);
      tone(880, .12, "triangle", .035);
    }
  }

  function updateBullets(dt) {
    updateProjectileArray(game.bullets, dt, true);
    updateProjectileArray(game.enemyBullets, dt, false);
  }

  function updateProjectileArray(arr, dt, playerOwned) {
    const room = currentRoom();
    for (let i = arr.length - 1; i >= 0; i--) {
      const b = arr[i];
      if (playerOwned && b.homing > 0) {
        const target = nearestEnemy(b.x, b.y, 260);
        if (target) {
          const a = angleTo(b.x, b.y, target.x, target.y);
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = lerp(b.vx, Math.cos(a) * speed, .04 * b.homing);
          b.vy = lerp(b.vy, Math.sin(a) * speed, .04 * b.homing);
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let remove = b.life <= 0;
      let wallHit = false;
      if (b.x < 10 || b.x > ROOM_W - 10) { b.vx *= -1; wallHit = true; b.x = clamp(b.x, 10, ROOM_W - 10); }
      if (b.y < 10 || b.y > ROOM_H - 10) { b.vy *= -1; wallHit = true; b.y = clamp(b.y, 10, ROOM_H - 10); }
      if (room) {
        for (const o of room.obstacles) {
          if (circleRect(b.x, b.y, b.r, o.x, o.y, o.w, o.h)) {
            wallHit = true;
            const cx = clamp(b.x, o.x, o.x + o.w);
            const cy = clamp(b.y, o.y, o.y + o.h);
            if (Math.abs(b.x - cx) > Math.abs(b.y - cy)) b.vx *= -1;
            else b.vy *= -1;
            break;
          }
        }
      }
      if (wallHit) {
        if (playerOwned && b.wallSplit) {
          const a = Math.atan2(b.vy, b.vx);
          createPlayerBullet(b.x, b.y, a + Math.PI / 2, .42, "split");
          createPlayerBullet(b.x, b.y, a - Math.PI / 2, .42, "split");
          b.wallSplit = false;
        }
        if (b.bounce > 0) b.bounce--; else remove = true;
      }
      if (playerOwned) {
        for (const e of game.enemies) {
          if (e.hp <= 0) continue;
          if (dist(b.x, b.y, e.x, e.y) < b.r + e.r) {
            applyBulletStatus(e, b);
            damageEnemy(e, b.damage, b.crit ? "crit" : "bullet");
            if (b.lightning > 0 && game.rng() < b.lightning) chainLightning(e, b.damage * .55);
            if (b.explosive > 0 && game.rng() < b.explosive) explode(b.x, b.y, 48, b.damage * .65, true);
            if (b.pierce > 0) b.pierce--; else remove = true;
            break;
          }
        }
      } else {
        const p = game.player;
        const d = dist(b.x, b.y, p.x, p.y);
        if (p.stats.nearMissSlow && d < p.r + b.r + 18 && d > p.r + b.r + 3) {
          b.vx *= .97; b.vy *= .97;
          if (game.rng() < .03) burst(p.x, p.y, 2, "#7df9ff", 80);
        }
        if (d < p.r + b.r) { hitPlayer(b.damage || 1, b.x, b.y); remove = true; }
      }
      if (remove) arr.splice(i, 1);
      else if (game.rng() < .25) particle(b.x, b.y, b.color || (playerOwned ? "#7df9ff" : "#ff5577"), 40, 0.18, 2);
    }
  }

  function applyBulletStatus(e, b) {
    if (b.burn > 0 && game.rng() < b.burn) e.status.burn = Math.max(e.status.burn, 3.0);
    if (b.poison > 0 && game.rng() < b.poison) e.status.poison = Math.max(e.status.poison, 4.0);
    if (b.freeze > 0 && game.rng() < b.freeze) e.status.freeze = Math.max(e.status.freeze, 1.6);
    if (game.player.stats.elementalReaction) {
      if (e.status.burn > 0 && e.status.poison > 0 && game.rng() < .22) explode(e.x, e.y, 42, b.damage * .55, true, "#63ff9d");
      if (e.status.freeze > 0 && b.lightning > 0 && game.rng() < .22) { e.status.stun = Math.max(e.status.stun, .65); burst(e.x, e.y, 10, "#8bd3ff", 160); }
    }
  }

  function chainLightning(source, dmg) {
    let jumps = 2 + Math.floor(game.player.branch.Alchemist / 4);
    let cur = source;
    while (jumps-- > 0) {
      const candidates = game.enemies.filter(e => e !== cur && e.hp > 0 && dist(cur.x, cur.y, e.x, e.y) < 190);
      if (!candidates.length) break;
      candidates.sort((a, b) => dist(cur.x, cur.y, a.x, a.y) - dist(cur.x, cur.y, b.x, b.y));
      const next = candidates[0];
      lightningLine(cur.x, cur.y, next.x, next.y);
      damageEnemy(next, dmg, "zap");
      cur = next;
    }
  }

  function nearestEnemy(x, y, maxD = Infinity) {
    let best = null, bd = maxD;
    for (const e of game.enemies) {
      const d = dist(x, y, e.x, e.y);
      if (e.hp > 0 && d < bd) { best = e; bd = d; }
    }
    return best;
  }

  function updateEnemies(dt) {
    const p = game.player;
    const speedCurse = p.enemySpeed || 1;
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const e = game.enemies[i];
      e.aiTime += dt;
      if (e.status.burn > 0) { e.status.burn -= dt; damageEnemy(e, 0.72 * dt * p.stats.damage, "burn", false); }
      if (e.status.poison > 0) { e.status.poison -= dt; damageEnemy(e, 0.58 * dt * p.stats.damage, "poison", false); }
      const slow = e.status.freeze > 0 ? .35 : 1;
      e.status.freeze = Math.max(0, e.status.freeze - dt);
      e.status.stun = Math.max(0, e.status.stun - dt);
      if (e.hp <= 0) { killEnemy(e, i); continue; }
      if (e.status.stun > 0) continue;

      if (e.boss) updateBoss(e, dt);
      else updateEnemyAI(e, dt, slow * speedCurse);

      if (dist(e.x, e.y, p.x, p.y) < e.r + p.r) {
        if (e.flags.explode) {
          explode(e.x, e.y, 68, 5, false, "#ff9f1c");
          e.hp = 0;
        } else {
          hitPlayer(e.damage, e.x, e.y);
          const a = angleTo(e.x, e.y, p.x, p.y);
          p.x += Math.cos(a) * 8; p.y += Math.sin(a) * 8;
        }
      }
    }
  }

  function enemyMoveTarget(e, d, a) {
    const p = game.player;
    const room = currentRoom();
    if (!room) return { x: p.x, y: p.y };
    const los = hasLineOfSight(room, e.x, e.y, p.x, p.y, e.r * .35);
    if (los) e.lastSeenPlayer = { x: p.x, y: p.y, time: game.time };

    if (e.role === "ranged" || e.role === "zone" || e.role === "turret") {
      if (d < e.desiredRange * .72) return findNearestReachablePoint(room, e.x - Math.cos(a) * 180, e.y - Math.sin(a) * 180);
      if (!los) return bestVantagePoint(e, p, e.desiredRange);
      return { x: e.x, y: e.y };
    }
    if (e.role === "bomber" && d > 90) {
      const side = Math.sin(e.aiTime * 1.7) > 0 ? 1 : -1;
      return findNearestReachablePoint(room, p.x + Math.cos(a + side * 0.82) * 54, p.y + Math.sin(a + side * 0.82) * 54);
    }
    if (e.role === "guard" && d < 95) return { x: e.x, y: e.y };
    return { x: e.lastSeenPlayer.x, y: e.lastSeenPlayer.y };
  }

  function bestVantagePoint(e, p, desired) {
    const room = currentRoom();
    const points = room.spawnPoints && room.spawnPoints.length ? room.spawnPoints : buildRoomSpawnPoints(room);
    let best = null, score = Infinity;
    for (const point of points) {
      const pd = dist(point.x, point.y, p.x, p.y);
      if (pd < desired * .62 || pd > desired * 1.45) continue;
      if (!hasLineOfSight(room, point.x, point.y, p.x, p.y, e.r * .35)) continue;
      const s = dist(e.x, e.y, point.x, point.y) + Math.abs(pd - desired) * 0.75;
      if (s < score) { best = point; score = s; }
    }
    return best || findNearestReachablePoint(room, p.x + Math.cos(angleTo(p.x, p.y, e.x, e.y)) * desired, p.y + Math.sin(angleTo(p.x, p.y, e.x, e.y)) * desired);
  }

  function refreshEnemyPath(e, target, dt) {
    e.pathTimer -= dt;
    const targetMoved = !e.pathTarget || dist(e.pathTarget.x, e.pathTarget.y, target.x, target.y) > 46;
    if (e.pathTimer > 0 && !targetMoved && e.path && e.waypointIndex < e.path.length) return;
    const room = currentRoom();
    e.path = findPath(room, e.x, e.y, target.x, target.y);
    e.pathTarget = { x: target.x, y: target.y };
    e.waypointIndex = e.path.length > 1 ? 1 : 0;
    e.pathTimer = 0.22 + game.rng() * 0.18;
  }

  function enemySeparation(e) {
    let sx = 0, sy = 0;
    for (const other of game.enemies) {
      if (other === e || other.hp <= 0) continue;
      const d = dist(e.x, e.y, other.x, other.y);
      const min = e.r + other.r + 16;
      if (d > 0 && d < min) {
        sx += (e.x - other.x) / d * (min - d);
        sy += (e.y - other.y) / d * (min - d);
      }
    }
    return { x: sx, y: sy };
  }

  function moveEnemyAlongPath(e, dt, speedMul, phase = false) {
    if (!e.path || e.waypointIndex >= e.path.length) return;
    const target = e.path[e.waypointIndex];
    if (dist(e.x, e.y, target.x, target.y) < Math.max(14, e.r + 4)) e.waypointIndex++;
    const next = e.path[Math.min(e.waypointIndex, e.path.length - 1)];
    if (!next) return;
    const sep = enemySeparation(e);
    const ax = (next.x - e.x) + sep.x * 1.5;
    const ay = (next.y - e.y) + sep.y * 1.5;
    const len = Math.hypot(ax, ay) || 1;
    const beforeX = e.x, beforeY = e.y;
    moveEntity(e, ax / len * e.speed * speedMul * dt, ay / len * e.speed * speedMul * dt, !phase);
    e.stuckTimer = dist(beforeX, beforeY, e.x, e.y) < 0.4 ? e.stuckTimer + dt : 0;
    if (e.stuckTimer > 0.28) {
      e.pathTimer = 0;
      e.waypointIndex = e.path.length;
      e.stuckTimer = 0;
    }
  }

  function updateEnemyAI(e, dt, speedMul) {
    const p = game.player;
    let a = angleTo(e.x, e.y, p.x, p.y);
    const d = dist(e.x, e.y, p.x, p.y);
    const room = currentRoom();
    const los = room ? hasLineOfSight(room, e.x, e.y, p.x, p.y, e.r * .35) : true;
    if (e.flags.buff) {
      for (const other of game.enemies) {
        if (other !== e && dist(e.x, e.y, other.x, other.y) < 150) other.speed = Math.min(other.speed * 1.0007, other.speed + .08);
      }
    }
    if (e.flags.turret) {
      e.shootCd -= dt;
      if (e.shootCd <= 0 && los) { e.shootCd = e.shootEvery; enemyShoot(e, a, 270, 1, "#7df9ff"); }
      return;
    }
    if (e.flags.pod) {
      e.shootCd -= dt;
      if (e.shootCd <= 0 && los) {
        e.shootCd = 2.4;
        game.hazards.push({ type: "poison", x: e.x + Math.cos(a)*70, y: e.y + Math.sin(a)*70, r: 18, ttl: 4.4, pulse: 0, dmg: .7 });
        trimVolatileArray(game.hazards, VOLATILE_LIMITS.hazards);
      }
    }
    if (e.flags.shoot) {
      e.shootCd -= dt;
      if (e.shootCd <= 0 && d < 560 && los) {
        e.shootCd = e.shootEvery * randRange(game.rng, .82, 1.25);
        enemyShoot(e, a, e.flags.buff ? 250 : 220, 1, e.baseColor);
      }
    }
    if (e.flags.shield && d < 420 && Math.abs(angleDiff(a, angleTo(e.x, e.y, p.x, p.y))) < .5) speedMul *= .75;
    const target = enemyMoveTarget(e, d, a);
    if ((e.role === "ranged" || e.role === "zone") && d > e.desiredRange * .85 && d < e.desiredRange * 1.15 && los) return;
    refreshEnemyPath(e, target, dt);
    moveEnemyAlongPath(e, dt, speedMul, e.flags.phase);
  }

  function angleDiff(a, b) {
    let d = (a - b + Math.PI) % TAU - Math.PI;
    return d < -Math.PI ? d + TAU : d;
  }

  function enemyShoot(e, a, speed = 230, damage = 1, color = "#ff5577") {
    game.enemyBullets.push({ x: e.x + Math.cos(a) * (e.r + 5), y: e.y + Math.sin(a) * (e.r + 5), vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5.5, damage, life: 3.8, color });
    trimVolatileArray(game.enemyBullets, VOLATILE_LIMITS.enemyBullets);
  }

  function updateBoss(e, dt) {
    const p = game.player;
    const name = e.bossName;
    const d = dist(e.x, e.y, p.x, p.y);
    const a = angleTo(e.x, e.y, p.x, p.y);
    e.shootCd -= dt;
    e.summonCd -= dt;
    const hpPct = e.hp / e.maxHp;
    if (hpPct < .55 && e.phase === 0) { e.phase = 1; notify(`${name} enrages!`, "#ff5577"); burst(e.x, e.y, 45, e.color, 280); }
    const speed = e.speed * (e.phase ? 1.25 : 1) * (p.enemySpeed || 1);

    if (name === "Bone Warden") {
      moveEntity(e, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt, true);
      if (e.shootCd <= 0) { e.shootCd = e.phase ? 1.0 : 1.45; radialShots(e.x, e.y, e.phase ? 14 : 10, 190, "#e7eefc"); }
      if (e.summonCd <= 0) { e.summonCd = 5.2; for (let i=0;i<2+e.phase;i++) spawnEnemy("ratling", e.x + randRange(game.rng,-80,80), e.y + randRange(game.rng,-80,80), game.depth, false); }
    } else if (name === "Eye of the Maze") {
      const orbit = a + Math.PI/2;
      moveEntity(e, Math.cos(orbit) * speed * dt, Math.sin(orbit) * speed * dt, true);
      if (e.shootCd <= 0) { e.shootCd = e.phase ? .7 : 1.0; enemyShoot(e, a, 310, 1, "#c084fc"); enemyShoot(e, a + .22, 260, 1, "#c084fc"); enemyShoot(e, a - .22, 260, 1, "#c084fc"); }
      if (e.summonCd <= 0) { e.summonCd = 4.5; e.x = randRange(game.rng, 160, ROOM_W-160); e.y = randRange(game.rng, 130, ROOM_H-130); burst(e.x, e.y, 25, "#c084fc", 180); }
    } else if (name === "Furnace Saint") {
      moveEntity(e, Math.cos(a) * speed * .75 * dt, Math.sin(a) * speed * .75 * dt, true);
      if (e.shootCd <= 0) { e.shootCd = e.phase ? .85 : 1.25; radialShots(e.x, e.y, e.phase ? 18 : 12, 150, "#ff5d22", .1); game.hazards.push({type:"fire",x:p.x,y:p.y,r:24,ttl:2.6,pulse:0,dmg:1.2}); trimVolatileArray(game.hazards, VOLATILE_LIMITS.hazards); }
      if (e.summonCd <= 0) { e.summonCd = 3.8; for (let i=0;i<4;i++) game.hazards.push({type:"fire",x:randRange(game.rng,120,ROOM_W-120),y:randRange(game.rng,100,ROOM_H-100),r:20,ttl:4,pulse:0,dmg:1}); trimVolatileArray(game.hazards, VOLATILE_LIMITS.hazards); }
    } else if (name === "Tax Collector") {
      const flee = d < 210 ? a + Math.PI : a;
      moveEntity(e, Math.cos(flee) * speed * dt, Math.sin(flee) * speed * dt, true);
      if (e.shootCd <= 0) { e.shootCd = e.phase ? .55 : .85; radialShots(e.x, e.y, e.phase ? 10 : 7, 270, "#ffd166", .24); }
      if (e.summonCd <= 0) { e.summonCd = 4.2; p.coins = Math.max(0, p.coins - 3); spawnPickupBurst(e.x, e.y, 5, "coin"); spawnEnemy("guard", e.x+40, e.y, game.depth, false); }
    } else if (name === "Infinite Hand") {
      const wave = Math.sin(game.time * 2.4);
      moveEntity(e, Math.cos(a + wave) * speed * dt, Math.sin(a + wave) * speed * dt, true);
      if (e.shootCd <= 0) { e.shootCd = e.phase ? .58 : .9; spiralShots(e.x, e.y, game.time * 2.2, e.phase ? 5 : 3); }
      if (e.summonCd <= 0) { e.summonCd = 3.3; smashHazard(p.x + randRange(game.rng,-60,60), p.y + randRange(game.rng,-60,60)); }
    }
  }

  function radialShots(x, y, n, speed, color, offset = 0) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + offset + game.time * .1;
      game.enemyBullets.push({ x, y, vx: Math.cos(a)*speed, vy: Math.sin(a)*speed, r: 5.5, damage: 1, life: 4, color });
    }
    trimVolatileArray(game.enemyBullets, VOLATILE_LIMITS.enemyBullets);
  }

  function spiralShots(x, y, base, arms) {
    for (let i = 0; i < arms; i++) {
      const a = base + i * TAU / arms;
      enemyShoot({x,y,r:10}, a, 250, 1, "#9a7bff");
    }
  }

  function smashHazard(x, y) {
    game.hazards.push({type:"smash",x,y,r:18,maxR:85,ttl:1.05,pulse:0,dmg:2.0});
    trimVolatileArray(game.hazards, VOLATILE_LIMITS.hazards);
    tone(100, .08, "sawtooth", .035);
  }

  function damageEnemy(e, amount, type = "hit", text = true) {
    if (!e || e.hp <= 0) return;
    if (e.flags && e.flags.shield && type === "bullet") {
      const face = angleTo(e.x, e.y, game.player.x, game.player.y);
      const shotFrom = angleTo(e.x, e.y, game.player.x, game.player.y);
      if (Math.abs(angleDiff(face, shotFrom)) < .7) amount *= .62;
    }
    e.hp -= amount;
    if (text && amount > .3) addDamageText(e.x, e.y - e.r, Math.ceil(amount), type === "crit" ? "#fff2a8" : "#ffffff");
    if (e.hp <= 0) burst(e.x, e.y, e.boss ? 60 : 16, e.color, e.boss ? 330 : 180);
  }

  function killEnemy(e, idx) {
    const p = game.player;
    game.enemies.splice(idx, 1);
    p.score += e.boss ? 500 + game.depth * 20 : 10 + game.depth;
    gainXp(e.xp * p.stats.xpGain * (e.boss ? 1.4 : 1));
    const coinChance = clamp(e.coin * game.personality.rewardMult, 0, 2.5);
    if (game.rng() < coinChance) spawnPickupBurst(e.x, e.y, 1 + Math.floor(coinChance), "coin");
    const heartChance = (0.045 * (p.heartDropMult || 1)) + (game.personality.id === "hungry" ? .03 : 0);
    if (game.rng() < heartChance) spawnPickupBurst(e.x, e.y, 1, "heart");
    if (game.rng() < .035 + p.stats.keyLuck) spawnPickupBurst(e.x, e.y, 1, "key");
    if (e.flags && e.flags.split && e.r > 10) {
      spawnEnemy("slime", e.x - 14, e.y, game.depth, false).r = 10;
      spawnEnemy("slime", e.x + 14, e.y, game.depth, false).r = 10;
    }
    if (e.flags && e.flags.explode) explode(e.x, e.y, 55, 4.5, false, "#ff9f1c");
    if (p.stats.vampire > 0 && game.rng() < p.stats.vampire) p.hp = Math.min(p.maxHp, p.hp + .5);
    if (e.boss) handleBossDeath(e);
    tone(e.boss ? 180 : 300, e.boss ? .16 : .03, e.boss ? "sawtooth" : "triangle", e.boss ? .05 : .02);
  }

  function handleBossDeath(e) {
    const p = game.player;
    p.bossesKilled++;
    game.bossMeter = 0;
    p.hp = Math.min(p.maxHp, p.hp + 1 + p.stats.healingOnClear);
    const relics = 1 + (game.rng() < .25 + p.stats.bossRelicBonus ? 1 : 0);
    for (let i = 0; i < relics; i++) addRelic(pick(game.rng, RELICS));
    p.coins += Math.floor((25 + p.bossesKilled * 8) * p.stats.coinGain);
    p.keys += game.rng() < .55 ? 1 : 0;
    notify(`${e.bossName} defeated. Boss meter reset.`, "#ffd166", 4);
  }

  function gainXp(amount) {
    const p = game.player;
    p.xp += amount;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = Math.floor(p.xpNext * 1.22 + 8);
      offerTalents(1, `Level ${p.level}`);
    }
  }

  function hitPlayer(amount, sx = null, sy = null) {
    const p = game.player;
    if (p.invuln > 0) return;
    p.hp -= amount;
    p.invuln = .72;
    game.cameraShake = 12;
    game.flash = .18;
    tone(90, .09, "sawtooth", .045);
    if (p.stats.thorns > 0) explode(p.x, p.y, 78, p.stats.thorns * 2.5 * p.stats.damage, true, "#c084fc");
    if (sx != null) {
      const a = angleTo(sx, sy, p.x, p.y);
      p.x += Math.cos(a) * 18;
      p.y += Math.sin(a) * 18;
    }
    if (p.hp <= 0) endGame();
  }

  function endGame() {
    game.over = true;
    saveHighScore();
    gameOverStats.innerHTML = `
      <div class="row game-over-stats-row">
        <span class="pill">Score ${Math.floor(game.player.score)}</span>
        <span class="pill">High ${game.highScore}</span>
        <span class="pill">Rooms ${game.statistics.roomsVisited}</span>
        <span class="pill">Bosses ${game.player.bossesKilled}</span>
        <span class="pill">Level ${game.player.level}</span>
      </div>
      <p><strong>Dungeon:</strong> ${escapeHtml(game.personality.name)}</p>
      <p><strong>Talents:</strong> ${game.player.talents.length ? escapeHtml(game.player.talents.join(", ")) : "None"}</p>
      <p><strong>Relics:</strong> ${game.player.relics.length ? escapeHtml(game.player.relics.join(", ")) : "None"}</p>
      <p><strong>Curses:</strong> ${game.player.curses.length ? escapeHtml(game.player.curses.map(c => c.name).join(", ")) : "None"}</p>
    `;
    gameOverPanel.style.display = "flex";
  }

  function updateHazards(dt) {
    const p = game.player;
    for (let i = game.hazards.length - 1; i >= 0; i--) {
      const h = game.hazards[i];
      h.ttl -= dt;
      h.pulse += dt;
      if (h.type === "blackHole") {
        h.r = lerp(h.r, h.maxR, .04);
        for (const e of game.enemies) {
          const d = dist(h.x, h.y, e.x, e.y);
          if (d < h.r + 70) {
            const a = angleTo(e.x, e.y, h.x, h.y);
            moveEntity(e, Math.cos(a) * 155 * dt, Math.sin(a) * 155 * dt, false);
            if (d < h.r) damageEnemy(e, h.dmg * dt, "void", false);
          }
        }
      } else if (h.type === "smash") {
        h.r = lerp(h.r, h.maxR, .13);
        if (h.ttl < .22 && dist(h.x, h.y, p.x, p.y) < h.r) hitPlayer(h.dmg, h.x, h.y);
      } else if (h.type === "gear") {
        h.x += Math.cos(h.pulse * 1.7) * 35 * dt;
        h.y += Math.sin(h.pulse * 1.3) * 35 * dt;
        if (dist(h.x, h.y, p.x, p.y) < h.r + p.r) hitPlayer(h.dmg, h.x, h.y);
      } else if (["poison", "fire", "void"].includes(h.type)) {
        if (dist(h.x, h.y, p.x, p.y) < h.r + p.r) hitPlayer(h.dmg * dt * 2.2, h.x, h.y);
        if (h.type === "fire") for (const e of game.enemies) if (dist(h.x,h.y,e.x,e.y)<h.r+e.r) e.status.burn = Math.max(e.status.burn, 1.5);
      } else if (h.type === "mirror") {
        for (const b of game.bullets) if (dist(h.x,h.y,b.x,b.y)<h.r+b.r && b.bounce <= 0) { b.vx *= -1; b.vy *= -1; b.bounce = 1; }
      }
      if (h.ttl <= 0) game.hazards.splice(i, 1);
    }
  }

  function updateTech(dt) {
    const p = game.player;
    for (let i = 0; i < game.drones.length; i++) {
      const d = game.drones[i];
      d.angle += dt * (1.6 + i * .08);
      d.x = p.x + Math.cos(d.angle) * (48 + i * 4);
      d.y = p.y + Math.sin(d.angle) * (48 + i * 4);
      d.cd -= dt;
      const t = nearestEnemy(d.x, d.y, 420);
      if (t && d.cd <= 0) {
        d.cd = .75;
        firePlayerShot(d.x, d.y, angleTo(d.x, d.y, t.x, t.y), "drone", .38);
      }
    }
    for (const t of game.turrets) {
      t.cd -= dt;
      const target = nearestEnemy(t.x, t.y, 520);
      if (target && t.cd <= 0) {
        t.cd = .44;
        firePlayerShot(t.x, t.y, angleTo(t.x, t.y, target.x, target.y), "turret", .45);
      }
    }
    for (let i = game.mines.length - 1; i >= 0; i--) {
      const m = game.mines[i];
      m.ttl -= dt;
      m.arm -= dt;
      if (m.arm <= 0) {
        for (const e of game.enemies) {
          if (dist(m.x, m.y, e.x, e.y) < m.r + e.r + 14) { explode(m.x, m.y, 62, 5 * p.stats.damage, true, "#ff9f1c"); game.mines.splice(i,1); break; }
        }
      }
      if (i < game.mines.length && m.ttl <= 0) game.mines.splice(i, 1);
    }
    const orbitalCount = p.stats.orbitals;
    if (orbitalCount > 0) {
      for (let i = 0; i < orbitalCount; i++) {
        const a = game.time * (2.4 + i * .03) + i * TAU / orbitalCount;
        const ox = p.x + Math.cos(a) * 64;
        const oy = p.y + Math.sin(a) * 64;
        for (const e of game.enemies) {
          if (dist(ox, oy, e.x, e.y) < 13 + e.r) damageEnemy(e, dt * 5.2 * p.stats.damage, "blade", false);
        }
      }
    }
  }

  function dropMine(x, y) {
    game.mines.push({ x, y, r: 16, ttl: 5, arm: .35 });
    trimVolatileArray(game.mines, VOLATILE_LIMITS.mines);
  }

  function explode(x, y, r, damage, playerOwned = true, color = "#ff9f1c") {
    burst(x, y, Math.floor(r / 2), color, 300);
    game.cameraShake = Math.max(game.cameraShake, 6);
    if (playerOwned) {
      for (const e of game.enemies) {
        const d = dist(x, y, e.x, e.y);
        if (d < r + e.r) damageEnemy(e, damage * (1 - d / (r + e.r) * .45), "boom");
      }
      if (game.player.selfExplosion && dist(x, y, game.player.x, game.player.y) < r * .42) hitPlayer(.5, x, y);
    } else {
      if (dist(x, y, game.player.x, game.player.y) < r + game.player.r) hitPlayer(damage / 2, x, y);
      for (const e of game.enemies) if (dist(x,y,e.x,e.y)<r+e.r) damageEnemy(e, damage*.22, "blast", false);
    }
    tone(105, .08, "sawtooth", .035);
    capVolatileArrays();
  }

  function updatePickups(dt) {
    const p = game.player;
    const magnet = 80 + p.stats.magnet;
    for (let i = game.pickups.length - 1; i >= 0; i--) {
      const it = game.pickups[i];
      it.x += it.vx * dt; it.y += it.vy * dt;
      it.vx *= Math.pow(.04, dt); it.vy *= Math.pow(.04, dt);
      const d = dist(it.x, it.y, p.x, p.y);
      if (d < magnet) {
        const a = angleTo(it.x, it.y, p.x, p.y);
        it.vx += Math.cos(a) * 420 * dt;
        it.vy += Math.sin(a) * 420 * dt;
        if (it.type === "coin" && p.relics.includes("Hungry Coin")) {
          for (const e of game.enemies) if (dist(it.x,it.y,e.x,e.y)<e.r+8) damageEnemy(e, .4, "coin", false);
        }
      }
      if (d < p.r + it.r + 3) {
        collectPickup(it);
        game.pickups.splice(i, 1);
      }
    }
  }

  function collectPickup(it) {
    const p = game.player;
    if (it.type === "coin") { p.coins += Math.max(1, Math.floor(it.value * p.stats.coinGain)); p.score += 1; tone(690, .025, "triangle", .014); }
    else if (it.type === "xp") gainXp(it.value * p.stats.xpGain);
    else if (it.type === "heart") { p.hp = Math.min(p.maxHp, p.hp + 1); tone(520, .04, "sine", .02); }
    else if (it.type === "key") { p.keys++; tone(880, .05, "triangle", .02); }
  }

  function updateRoomCompletion() {
    const room = currentRoom();
    if (!room || room.cleared) return;
    if (["combat", "elite", "cursed", "boss"].includes(room.type) && game.enemies.length === 0) {
      room.cleared = true;
      room.locked = false;
      clearRoomCombatEffects();
      const p = game.player;
      p.roomClears++;
      if (room.type !== "boss") game.bossMeter++;
      p.score += room.type === "elite" ? 75 : room.type === "cursed" ? 55 : 35;
      const coins = Math.floor((8 + game.depth * .8 + (room.type === "elite" ? 18 : 0)) * p.stats.coinGain * game.personality.rewardMult);
      p.coins += coins;
      if (room.type === "elite") addRelic(pick(game.rng, RELICS));
      if (p.stats.healingOnClear > 0) p.hp = Math.min(p.maxHp, p.hp + p.stats.healingOnClear);
      if (game.rng() < .18 + p.stats.chestLuck) room.interactables.push({ type: "chest", x: ROOM_W/2, y: ROOM_H/2, r: 26, used: false, locked: false, rarity: "normal", label: "Clear Chest" });
      notify(`Room clear +${coins} coins`, "#63ff9d", 2.1);
      burst(ROOM_W/2, ROOM_H/2, 28, "#63ff9d", 220);
      revealAdjacent(room.x, room.y);
      if (game.bossMeter >= game.bossMeterMax) notify("Boss meter full. Next new room becomes a boss gate.", "#ff5577", 4);
    }
  }

  function updateTransitions(dt = 0) {
    const room = currentRoom();
    if (!room || room.locked) return;
    game.transitionGrace = Math.max(0, (game.transitionGrace || 0) - dt);
    if (game.transitionGrace > 0) return;
    const p = game.player;
    const zones = room.doorZones && room.doorZones.length ? room.doorZones : buildRoomDoorZones(room.exits);
    for (const zone of zones) {
      if (!zone.open || !pointInRect(p.x, p.y, zone.transition, p.r * .5)) continue;
      const d = DIRS.find(v => v.name === zone.dir);
      enterRoom(game.roomX + d.dx, game.roomY + d.dy, OPP[zone.dir]);
      return;
    }
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(.08, dt); p.vy *= Math.pow(.08, dt);
      p.life -= dt;
      if (p.life <= 0) game.particles.splice(i, 1);
    }
  }

  function updateDamageTexts(dt) {
    for (let i = game.damageTexts.length - 1; i >= 0; i--) {
      const t = game.damageTexts[i];
      t.y -= 38 * dt; t.life -= dt;
      if (t.life <= 0) game.damageTexts.splice(i, 1);
    }
  }

  function updateNotifications(dt) {
    for (let i = game.notifications.length - 1; i >= 0; i--) {
      const n = game.notifications[i];
      n.ttl -= dt;
      if (n.ttl <= 0) game.notifications.splice(i, 1);
    }
  }

    Object.assign(D, {
      update,
      VOLATILE_LIMITS,
      trimVolatileArray,
      capVolatileArrays,
      clearRoomCombatEffects,
      updatePausedCleanup,
      updateMouseLocal,
      updatePlayer,
      moveEntity,
      resolveWalls,
      circleRect,
      nearestInteractable,
      tryInteract,
      updateShooting,
      firePlayerShot,
      createPlayerBullet,
      updateAbilities,
      useAbility,
      updateBullets,
      updateProjectileArray,
      applyBulletStatus,
      chainLightning,
      nearestEnemy,
      updateEnemies,
      enemyMoveTarget,
      bestVantagePoint,
      refreshEnemyPath,
      enemySeparation,
      moveEnemyAlongPath,
      updateEnemyAI,
      angleDiff,
      enemyShoot,
      updateBoss,
      radialShots,
      spiralShots,
      smashHazard,
      damageEnemy,
      killEnemy,
      handleBossDeath,
      gainXp,
      hitPlayer,
      endGame,
      updateHazards,
      updateTech,
      dropMine,
      explode,
      updatePickups,
      collectPickup,
      updateRoomCompletion,
      updateTransitions,
      updateParticles,
      updateDamageTexts,
      updateNotifications
    });
  }
})(window.Depthbound = window.Depthbound || {});
