(function (ns) {
    const RESOURCE_SCALE = .7;
    function weaponData(module) { return ns.Data.WEAPON_TYPES[module?.weapon || 'pulse'] || ns.Data.WEAPON_TYPES.pulse; }
    function jammed(game) { return game.enemies?.some(enemy => enemy.hull > 0 && enemy.archetype === 'jammer_drone' && ns.MathUtil.distance(enemy, game.state.ship) <= 380); }
    function targetFor(game, module) {
        if (!game.enemies?.length) return null;
        const selected = game.enemies[0], spec = weaponData(module); if ((spec.type === 'missile' || spec.lock) && !jammed(game)) return selected;
        return ns.Progression.traitEffects(game.state).targetHunter ? selected : null;
    }
    function projectile(game, slot, module, angle, damageScale, target) {
        const spec = weaponData(module), ship = game.state.ship, muzzle = game.weaponMuzzle(slot, module), speed = spec.speed;
        return { x: muzzle.x, y: muzzle.y, vx: ship.vx + Math.cos(angle) * speed, vy: ship.vy + Math.sin(angle) * speed, radius: spec.type === 'missile' ? 5 : ['rail', 'nova', 'vortex'].includes(spec.type) ? 4 : spec.type === 'mine' ? 7 : 3, damage: module.damage * damageScale, life: spec.life, maxLife: spec.life, enemy: false, type: spec.type, color: spec.color, turnRate: spec.turnRate || (target ? .9 : 0), splash: spec.splash || 0, chain: spec.chain || 0, chainRange: spec.chainRange || 0, pierce: spec.pierce || 0, proximity: spec.proximity || 0, antiProjectile: Boolean(spec.antiProjectile), status: spec.status || null, siphon: spec.siphon || null, vortex: spec.vortex || null, hitIds: [], targetId: target?.id || null };
    }
    function fire(game, slot, chargeScale) {
        if (!game.random) game.random = new ns.Runtime.SimulationRandom(game.state?.worldSeed || 1);
        const state = game.state, ship = state.ship, stats = ns.Progression.calculateShipStats(state), module = ns.Data.MODULES[ship.slots[slot]], spec = weaponData(module);
        if (!module || game.weaponCooldowns[slot] > 0) return false;
        const ramp = spec.ramp ? (game.weaponRamps?.[slot]?.value || 1) : 1, scale = chargeScale || 1, energy = module.energy * scale * RESOURCE_SCALE, heatTraitScale = 1 + (stats.effects.weaponHeat || 0), stability = module.mass >= 12 ? 1 - (stats.heavyStability || 0) : 1, heat = module.heat * scale * RESOURCE_SCALE * heatTraitScale * ramp * stability * ns.Abilities.heatScale(state);
        if (ship.energy < energy || ship.heat + heat > 100) return false;
        let empowered = false;
        if (stats.effects.weaponsFree && game.lastWeaponShot && game.lastWeaponShot.slot !== slot && game.time - game.lastWeaponShot.time <= .5) empowered = true;
        game.weaponCooldowns[slot] = module.fireRate; ship.energy -= energy; ship.heat += heat * (empowered ? .8 : 1); ns.Abilities.onFire(state);
        const critical = game.random.chance(stats.effects.critical || 0), criticalPower = 2 + (stats.effects.criticalPower || 0) + (stats.effects.targetHunter ? .15 : 0), damageScale = scale * ramp * (empowered ? 1.25 : 1) * (critical ? criticalPower : 1), target = targetFor(game, module), baseAngle = ship.angle;
        if (spec.type === 'scatter') for (let i = 0; i < spec.pellets; i++) game.bullets.push(projectile(game, slot, module, baseAngle + (i - (spec.pellets - 1) / 2) * spec.spread / Math.max(1, spec.pellets - 1), damageScale, target));
        else game.bullets.push(projectile(game, slot, module, baseAngle, damageScale, target));
        game.lastWeaponShot = { slot, time: game.time }; return true;
    }
    function control(game, slot, held, dt) {
        const module = ns.Data.MODULES[game.state.ship.slots[slot]], spec = weaponData(module); game.weaponCharges = game.weaponCharges || {}; game.weaponLocks = game.weaponLocks || {}; game.weaponRamps = game.weaponRamps || {};
        if (!module || !spec.charge) { if (held) fire(game, slot); return; }
        const charge = game.weaponCharges[slot] || { value: 0, active: false };
        if (held && game.weaponCooldowns[slot] <= 0) { charge.active = true; charge.value = Math.min(spec.charge.max, charge.value + dt); if (charge.value >= spec.charge.max) { fire(game, slot, 1.5); charge.value = 0; charge.active = false; } }
        else if (!held && charge.active) { if (charge.value >= spec.charge.min) fire(game, slot, .55 + charge.value / spec.charge.max * .95); charge.value = 0; charge.active = false; }
        game.weaponCharges[slot] = charge;
    }
    function advancedControl(game, slot, held, dt) {
        const module = ns.Data.MODULES[game.state.ship.slots[slot]], spec = weaponData(module);
        game.weaponLocks = game.weaponLocks || {}; game.weaponRamps = game.weaponRamps || {};
        if (!module) return false;
        if (spec.lock) {
            const target = targetFor(game, module), lock = game.weaponLocks[slot] || { value: 0, targetId: null };
            if (!held || !target || jammed(game)) { lock.value = Math.max(0, lock.value - dt * 2); lock.targetId = target?.id || null; }
            else {
                if (lock.targetId !== target.id) lock.value = 0;
                lock.targetId = target.id; lock.value = Math.min(spec.lock, lock.value + dt);
                if (lock.value >= spec.lock && game.weaponCooldowns[slot] <= 0 && fire(game, slot)) lock.value = 0;
            }
            game.weaponLocks[slot] = lock; return true;
        }
        if (spec.ramp) {
            const ramp = game.weaponRamps[slot] || { value: 1, idle: 0 };
            if (held) { ramp.idle = 0; ramp.value = Math.min(spec.ramp.max, ramp.value + spec.ramp.step * dt / Math.max(.05, module.fireRate)); fire(game, slot); }
            else { ramp.idle += dt; if (ramp.idle >= spec.ramp.reset) ramp.value = 1; }
            game.weaponRamps[slot] = ramp; return true;
        }
        return false;
    }
    function updateProjectile(game, bullet, dt) {
        if (bullet.antiProjectile && !bullet.enemy) {
            const intercepted = game.bullets.find(other => other !== bullet && other.enemy && other.type === 'missile' && other.life > 0 && ns.MathUtil.distance(other, bullet) <= bullet.proximity);
            if (intercepted) { intercepted.life = 0; bullet.life = 0; game.effects.push({ x: intercepted.x, y: intercepted.y, vx: 0, vy: 0, life: .2, maxLife: .2, size: 24, flash: true, color: bullet.color }); return; }
        }
        if (bullet.proximity && !bullet.antiProjectile && !bullet.enemy) {
            const target = game.enemies.find(enemy => enemy.hull > 0 && ns.MathUtil.distance(enemy, bullet) <= bullet.proximity);
            if (target) { bullet.life = 0; target.hull -= bullet.damage; playerHit(game, bullet, target); if (target.hull <= 0 && game.onEnemyKilled) game.onEnemyKilled(target); game.effects.push({ x: bullet.x, y: bullet.y, vx: 0, vy: 0, life: .24, maxLife: .24, size: bullet.splash || 40, flash: true, color: bullet.color }); return; }
        }
        if (!bullet.targetId || !bullet.turnRate) return;
        const target = bullet.targetPlayer ? game.state.ship : game.enemies.find(enemy => enemy.id === bullet.targetId && enemy.hull > 0); if (!target) return;
        const speed = Math.hypot(bullet.vx, bullet.vy), current = Math.atan2(bullet.vy, bullet.vx), desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        let delta = ((desired - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI; delta = ns.MathUtil.clamp(delta, -bullet.turnRate * dt, bullet.turnRate * dt);
        bullet.vx = Math.cos(current + delta) * speed; bullet.vy = Math.sin(current + delta) * speed;
    }
    function playerHit(game, bullet, target) {
        if (bullet.status) { target.disabled = Math.max(target.disabled || 0, bullet.status.disabled || 0); target.slowed = Math.max(target.slowed || 0, bullet.status.disabled || 0); target.slowScale = bullet.status.slow || 1; }
        if (bullet.siphon) { const stats = ns.Progression.calculateShipStats(game.state); game.state.ship.energy = Math.min(stats.reactor, game.state.ship.energy + (bullet.siphon.energy || 0)); game.state.ship.heat = Math.max(0, game.state.ship.heat - (bullet.siphon.heat || 0)); }
        if (bullet.splash) game.enemies.filter(enemy => enemy !== target && enemy.hull > 0 && ns.MathUtil.distance(enemy, target) <= bullet.splash).forEach(enemy => { enemy.hull -= bullet.damage * .45; if (enemy.hull <= 0) game.onEnemyKilled(enemy); });
        if (bullet.vortex) game.enemies.filter(enemy => enemy !== target && enemy.hull > 0 && ns.MathUtil.distance(enemy, target) <= bullet.vortex.radius).forEach(enemy => { const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x), pull = bullet.vortex.pull || 0; enemy.vx = (enemy.vx || 0) + Math.cos(angle) * pull; enemy.vy = (enemy.vy || 0) + Math.sin(angle) * pull; });
        if (bullet.chain) {
            let source = target; game.enemies.filter(enemy => enemy !== target && enemy.hull > 0).sort((a, b) => ns.MathUtil.distance(a, source) - ns.MathUtil.distance(b, source)).slice(0, bullet.chain).forEach(enemy => { if (ns.MathUtil.distance(enemy, source) <= bullet.chainRange) { enemy.hull -= bullet.damage * .55; game.effects.push({ x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: .16, maxLife: .16, size: 18, flash: true, color: bullet.color }); if (enemy.hull <= 0) game.onEnemyKilled(enemy); source = enemy; } });
        }
    }
    const basicControl = control;
    control = function (game, slot, held, dt) { if (advancedControl(game, slot, held, dt)) return; return basicControl(game, slot, held, dt); };
    ns.Weapons = { RESOURCE_SCALE, weaponData, jammed, targetFor, fire, control, updateProjectile, playerHit };
})(window.MiniInvadersV2);
