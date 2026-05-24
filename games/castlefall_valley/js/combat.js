// Combat covers spawning, targeting, attacks, damage, and projectile collisions.

  function spawnUnit(type, side, spend = true) {
    const def = unitDefs[type];
    if (!def) return false;

    if (side === 1 && spend) {
      if ((state.spawnCooldowns[type] || 0) > 0) {
        return false;
      }

      if (state.gold < def.cost) {
        showMessage("Not enough gold.");
        return false;
      }
      state.gold -= def.cost;
      state.spawnCooldowns[type] = def.spawnCd;
    }

    const castleX = side === 1 ? state.playerCastle.x + 65 : state.enemyCastle.x - 65;
    const lane = Math.floor(rand(-2, 3));

    const forgeBonus = side === 1 ? state.playerCastle.forge * 2 : Math.floor(state.wave / 4);
    const moraleBonus = side === 1 ? (state.morale - 50) * 0.003 : 0;

    const u = {
      id: Math.random().toString(36).slice(2),
      type,
      side,
      role: def.role,
      x: castleX + rand(-12, 12),
      y: terrainY(castleX),
      vx: 0,
      hp: def.hp * (1 + (side === -1 ? state.wave * 0.025 : 0)),
      maxHp: def.hp * (1 + (side === -1 ? state.wave * 0.025 : 0)),
      dmg: def.dmg + forgeBonus,
      speed: def.speed * (1 + moraleBonus),
      range: def.range,
      attackCd: def.attackCd,
      attackTimer: rand(0, 0.4),
      size: def.size,
      color: def.color,
      lane,
      target: null,
      flash: 0,
      chargeStored: 0,
      label: def.label
    };

    state.units.push(u);
    particle(u.x, terrainY(u.x) - 8, side === 1 ? "#76b7ff" : "#ff6b6b", 4);
    updateUI();
    return true;
  }

  function nearestEnemy(unit, maxDist = Infinity) {
    let best = null;
    let bd = maxDist;
    for (const other of state.units) {
      if (other.side === unit.side) continue;
      const d = Math.abs(other.x - unit.x);
      if (d < bd) {
        bd = d;
        best = other;
      }
    }

    const castleX = unit.side === 1 ? state.enemyCastle.x : state.playerCastle.x;
    const castleDist = Math.abs(castleX - unit.x);
    if (castleDist < bd) {
      return { castle: true, x: castleX, dist: castleDist };
    }

    return best;
  }

  function nearestAllyRole(unit, role) {
    let best = null;
    let bd = Infinity;
    for (const other of state.units) {
      if (other === unit || other.side !== unit.side || other.role !== role) continue;
      const d = Math.abs(other.x - unit.x);
      if (d < bd) {
        bd = d;
        best = other;
      }
    }
    return best;
  }

  function frontlineX() {
    const playerUnits = state.units.filter(u => u.side === 1);
    if (!playerUnits.length) return state.playerCastle.x;
    return playerUnits.reduce((a, u) => a + u.x, 0) / playerUnits.length;
  }

  function heroAttack() {
    const h = state.hero;
    h.attackTimer = 0.42;
    let hit = false;
    const reach = 60;
    const arcX = h.x + h.facing * 42;

    for (const u of state.units) {
      if (u.side === 1) continue;
      const dx = Math.abs(u.x - arcX);
      const dy = Math.abs((terrainY(u.x) - u.size) - (h.y + h.h * 0.5));
      if (dx < reach && dy < 65) {
        damageUnit(u, 28, h.x);
        hit = true;
      }
    }

    if (Math.abs(state.enemyCastle.x - arcX) < 80) {
      state.enemyCastle.hp -= 18;
      hit = true;
      addFloatText(state.enemyCastle.x, terrainY(state.enemyCastle.x) - 120, "-18 castle", "#ffdddd");
    }

    particle(arcX, h.y + 22, hit ? "#fff3b0" : "#b8c1d1", hit ? 12 : 4);
    if (hit) {
      state.morale = clamp(state.morale + 0.8, 0, 100);
      state.shake = Math.max(state.shake, 3);
    }
  }

  function damageUnit(u, amount, sourceX) {
    u.hp -= amount;
    u.flash = 0.14;
    u.x += Math.sign(u.x - sourceX) * 4;
    addFloatText(u.x, terrainY(u.x) - 42, "-" + Math.round(amount), "#ffe2e2");
    particle(u.x, terrainY(u.x) - 18, u.side === 1 ? "#76b7ff" : "#ff6b6b", 5);

    if (u.hp <= 0) {
      state.morale = clamp(state.morale + (u.side === -1 ? 2.2 : -2.5), 0, 100);
      particle(u.x, terrainY(u.x) - 20, "#2b2730", 12);
    }
  }

  function fireProjectile(from, target) {
    const tx = target.x;
    const ty = terrainY(target.x) - target.size - 18;
    const sx = from.x;
    const sy = terrainY(from.x) - from.size - 23;

    state.projectiles.push({
      x: sx,
      y: sy,
      vx: (tx - sx) * 1.35,
      vy: (ty - sy) * 1.35 - 90,
      life: 1,
      side: from.side,
      dmg: from.dmg,
      color: from.side === 1 ? "#bde5ff" : "#ffc3c3"
    });
  }

  function updateProjectiles(dt) {
    for (const p of state.projectiles) {
      p.life -= dt;
      p.vy += 280 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      for (const u of state.units) {
        if (u.side === p.side) continue;
        const uy = terrainY(u.x) - u.size - 16;
        if (Math.abs(u.x - p.x) < 16 && Math.abs(uy - p.y) < 28) {
          damageUnit(u, p.dmg, p.x);
          p.life = -1;
          break;
        }
      }

      const h = state.hero;
      if (p.side === -1 && Math.abs(h.x - p.x) < 20 && Math.abs(h.y + h.h / 2 - p.y) < 32) {
        h.hp -= p.dmg * 0.6;
        h.hurtTimer = 0.2;
        p.life = -1;
        addFloatText(h.x, h.y, "-" + Math.round(p.dmg * 0.6), "#ffd0d0");
      }
    }

    state.projectiles = state.projectiles.filter(p => p.life > 0);
  }

Object.assign(window.CastlefallValley, { spawnUnit, nearestEnemy, nearestAllyRole, frontlineX, heroAttack, damageUnit, fireProjectile, updateProjectiles });
