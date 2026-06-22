(function (ns) {
    const { distance } = ns.MathUtil;
    function isFaction(faction) { return faction === 'concord' || faction === 'corsairs'; }
    function hostileToPlayer(state, enemy) {
        if (enemy.faction === 'bandits') return true;
        return enemy.aggroed || ns.Expansion.patrolStatus(state, enemy.faction) === 'HOSTILE';
    }
    function opposing(a, b) {
        if (!a || !b || a === b) return false;
        if (a === 'bandits' || b === 'bandits') return true;
        return ns.Data.FACTIONS[a]?.hostileTo === b;
    }
    function definition(id) { return ns.Data.ENEMY_TYPES[id] || ns.Data.BOSSES[id] || ns.Data.ENEMY_TYPES.bandit; }
    function create(game, id, x, y, options) {
        const def = definition(id), opts = options || {}, danger = game.region?.danger || 1, boss = Boolean(ns.Data.BOSSES[id]), hull = def.hull + (boss ? danger * 35 : danger * 10);
        const componentState = opts.components || Object.fromEntries((def.components || []).map(component => [component.id, component.hull]));
        return { id: opts.id || `hostile:${Date.now()}:${Math.random()}`, x, y, vx: 0, vy: 0, angle: opts.angle || 0, radius: def.radius, hull: opts.hull || hull, maxHull: hull, cooldown: .4 + Math.random(), faction: opts.faction || def.faction, team: opts.faction || def.team, archetype: id, weaponPattern: def.weapon, role: opts.role || def.role || 'hostile', formation: opts.formation || null, aggroed: Boolean(opts.aggroed), disabled: 0, slowed: 0, slowScale: 1, bossType: boss ? id : null, bossPhase: opts.bossPhase || 1, deployCount: opts.deployCount || 0, persistent: boss, roaming: Boolean(opts.roaming), telegraph: 0, shielded: false, components: componentState, patternTimer: opts.patternTimer || 0, specialTimer: opts.specialTimer || 0, queuedPattern: opts.queuedPattern || null };
    }
    function spawn(game, count, center, faction, role, archetype) {
        if (!game.enemies.length) game.bulkheadsUsed = false;
        const formation = role === 'escort', formationAngle = formation ? Math.atan2(game.state.ship.y - center.y, game.state.ship.x - center.x) + Math.PI : 0;
        const direction = { x: Math.cos(formationAngle), y: Math.sin(formationAngle) }, lateral = { x: -direction.y, y: direction.x }, spawnDistance = ns.Contracts.ESCORT_CONFIG.enemySpawnDistance, spawned = [];
        for (let i = 0; i < count; i++) {
            const angle = i / Math.max(1, count) * Math.PI * 2, row = Math.ceil(i / 2), side = i === 0 ? 0 : i % 2 ? -1 : 1;
            const x = formation ? center.x + direction.x * (spawnDistance + row * 45) + lateral.x * side * row * 55 : center.x + Math.cos(angle) * (280 + i * 35), y = formation ? center.y + direction.y * (spawnDistance + row * 45) + lateral.y * side * row * 55 : center.y + Math.sin(angle) * (280 + i * 35);
            let type = archetype;
            if (!type && faction === 'concord') type = 'concord_patrol'; else if (!type && faction === 'corsairs') type = 'corsair_raider';
            if (!type) {
                const danger = game.region?.danger || 1, regular = ['bandit', 'interceptor', 'gunship', 'missile_skiff', 'striker'];
                const specialists = Object.values(ns.Data.ENEMY_TYPES).filter(def => def.minDanger && danger >= def.minDanger && (!faction || def.faction === faction || def.faction === 'bandits')).map(def => def.id);
                const roster = i > 0 && specialists.length ? regular.concat(specialists, specialists) : regular; type = roster[i % roster.length];
            }
            const enemy = create(game, type, x, y, { id: `hostile:${Date.now()}:${i}`, faction: faction || definition(type).faction, role, formation: formation ? 'wedge' : null, angle: formation ? formationAngle + Math.PI : angle + Math.PI });
            game.enemies.push(enemy); spawned.push(enemy);
        }
        return spawned;
    }
    function spawnBoss(game, contract) {
        const saved = contract.bossState || {}, boss = create(game, contract.bossType, contract.target.x, contract.target.y, { id: contract.encounterId, hull: saved.hull, bossPhase: saved.phase, deployCount: saved.deployCount, components: saved.components, patternTimer: saved.patternTimer, specialTimer: saved.specialTimer, queuedPattern: saved.queuedPattern, roaming: contract.roaming });
        boss.maxHull = definition(contract.bossType).hull + (game.region?.danger || 1) * 35; boss.hull = Math.min(boss.maxHull, saved.hull || boss.maxHull); boss.contractRef = contract; game.enemies.push(boss); return boss;
    }
    function fire(game, enemy, target, def) {
        const spec = ns.Data.WEAPON_TYPES[def.weapon] || ns.Data.WEAPON_TYPES.pulse, angle = Math.atan2(target.y - enemy.y, target.x - enemy.x), count = spec.pellets || 1;
        for (let i = 0; i < count; i++) { const a = angle + (i - (count - 1) / 2) * (spec.spread || 0) / Math.max(1, count - 1); game.bullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * Math.min(spec.speed, 520), vy: Math.sin(a) * Math.min(spec.speed, 520), radius: spec.type === 'missile' ? 5 : 3, damage: def.damage, life: Math.min(3, spec.life + .6), enemy: true, ownerTeam: enemy.team, type: spec.type, color: spec.color, turnRate: spec.turnRate || 0, targetPlayer: target === game.state.ship, targetId: target.id || null }); }
    }
    function fireFan(game, enemy, target, def, count, spread) {
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x), spec = ns.Data.WEAPON_TYPES[def.weapon] || ns.Data.WEAPON_TYPES.pulse;
        for (let i = 0; i < count; i++) { const a = angle + (i - (count - 1) / 2) * spread / Math.max(1, count - 1); game.bullets.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a) * Math.min(spec.speed, 500), vy: Math.sin(a) * Math.min(spec.speed, 500), radius: spec.type === 'missile' ? 5 : 3, damage: def.damage, life: Math.min(4.5, spec.life + .6), enemy: true, ownerTeam: enemy.team, type: spec.type, color: spec.color, turnRate: spec.turnRate || 0, splash: spec.splash || 0, targetPlayer: true, targetId: 'player' }); }
    }
    function mine(game, enemy, angle, distanceFrom) {
        game.bullets.push({ x: enemy.x + Math.cos(angle) * (distanceFrom || 35), y: enemy.y + Math.sin(angle) * (distanceFrom || 35), vx: 0, vy: 0, radius: 11, damage: 30, life: 12, enemy: true, ownerTeam: enemy.team, type: 'mine', color: '#ff9b42', targetPlayer: true });
    }
    function componentAlive(enemy, effect) {
        const def = definition(enemy.archetype); return (def.components || []).some(component => component.effect === effect && (enemy.components?.[component.id] || 0) > 0);
    }
    function saveBossState(game, enemy) {
        const snapshot = { hull: enemy.hull, phase: enemy.bossPhase, deployCount: enemy.deployCount, components: enemy.components, patternTimer: enemy.patternTimer, specialTimer: enemy.specialTimer, queuedPattern: enemy.queuedPattern };
        if (enemy.contractRef) enemy.contractRef.bossState = snapshot;
        const contract = game.state.contracts.active; if (contract?.bossType === enemy.bossType) contract.bossState = snapshot;
        const threat = game.state.progression?.roamingThreat; if (enemy.roaming && threat?.bossType === enemy.bossType) threat.bossState = snapshot;
    }
    function patternReady(enemy, type, dt, duration) {
        if (!enemy.queuedPattern) { if (enemy.patternTimer > 0) return false; enemy.queuedPattern = { type, timer: duration || .8 }; enemy.telegraph = Math.max(enemy.telegraph, duration || .8); return false; }
        if (enemy.queuedPattern.type !== type) return false;
        enemy.queuedPattern.timer -= dt; enemy.telegraph = Math.max(enemy.telegraph, enemy.queuedPattern.timer);
        if (enemy.queuedPattern.timer > 0) return false; enemy.queuedPattern = null; return true;
    }
    function updateCapital(game, enemy, def, dt) {
        enemy.patternTimer -= dt; enemy.specialTimer -= dt; const target = game.state.ship, support = game.enemies.filter(other => other !== enemy && other.role === 'boss-support' && other.hull > 0);
        if (def.controller === 'foundry') {
            const bays = componentAlive(enemy, 'deploy') ? 2 : 0, cap = 3 + enemy.bossPhase * 2;
            if (enemy.specialTimer <= 0 && bays && support.length < cap) { spawn(game, Math.min(bays + enemy.bossPhase, cap - support.length), enemy, enemy.faction, 'boss-support', enemy.bossPhase >= 2 ? 'torpedo_bomber' : 'interceptor'); enemy.specialTimer = Math.max(4, 10 - enemy.bossPhase * 1.5); game.notify('FOUNDRY ARK // FABRICATION BAYS OPEN'); }
            if (enemy.bossPhase >= 2 && patternReady(enemy, 'mine-ring', dt, 1)) { for (let i = 0; i < 8; i++) mine(game, enemy, i / 8 * Math.PI * 2, enemy.radius + 35); enemy.patternTimer = 9; game.notify('FOUNDRY ARK // MINE RING DEPLOYED'); }
        } else if (def.controller === 'bastion') {
            enemy.shielded = componentAlive(enemy, 'shield') && Math.floor(game.time / Math.max(2, 5 - enemy.bossPhase)) % 2 === 0;
            if (patternReady(enemy, 'broadside', dt, 1.1)) { fireFan(game, enemy, target, def, 5 + enemy.bossPhase * 2, Math.PI * 1.35); enemy.patternTimer = Math.max(3.8, 7 - enemy.bossPhase); game.notify('SOLAR BASTION // BROADSIDE LATTICE'); }
            if (enemy.specialTimer <= 0 && support.length < 4) { spawn(game, 2, enemy, enemy.faction, 'boss-support', 'beam_lancer'); enemy.specialTimer = 12; }
        } else if (def.controller === 'eclipse') {
            const engines = componentAlive(enemy, 'blink');
            if (enemy.specialTimer <= 0 && engines) { const a = Math.atan2(target.y - enemy.y, target.x - enemy.x) + Math.PI / 2 * (Math.random() < .5 ? -1 : 1); enemy.x = target.x + Math.cos(a) * 360; enemy.y = target.y + Math.sin(a) * 360; enemy.specialTimer = Math.max(4, 9 - enemy.bossPhase); game.notify('ECLIPSE CRUISER // PHASE SIGNATURE SHIFT'); }
            if (patternReady(enemy, 'torpedo-fan', dt, .9)) { fireFan(game, enemy, target, def, 3 + enemy.bossPhase * 2, .85); enemy.patternTimer = Math.max(3, 6.5 - enemy.bossPhase); }
        }
    }
    function bossUpdate(game, enemy, def, dt) {
        const ratio = enemy.hull / enemy.maxHull, phase = ratio <= .33 ? 3 : ratio <= .66 ? 2 : 1;
        if (phase !== enemy.bossPhase) { enemy.bossPhase = phase; game.notify(`${def.name.toUpperCase()} // PHASE ${phase} // ATTACK PATTERN SHIFT`); }
        if (def.capital) updateCapital(game, enemy, def, dt);
        else {
            enemy.shielded = enemy.bossType === 'aegis_frigate' && Math.floor(game.time / 4) % 2 === 0;
            const requiredDeploys = enemy.bossType === 'marauder_carrier' ? phase - 1 : Math.max(0, phase - 2); while (enemy.deployCount < requiredDeploys) { enemy.deployCount++; spawn(game, 2 + enemy.deployCount, enemy, enemy.faction, 'boss-support', def.deploy); game.notify(`${def.name.toUpperCase()} // DEPLOYMENT BAY OPEN`); }
            if (enemy.bossType === 'void_reaver' && enemy.patternTimer <= 0) { fireFan(game, enemy, game.state.ship, def, 2 + phase, .7); enemy.patternTimer = Math.max(2.8, 5.5 - phase); }
        }
        if (enemy.cooldown < (def.telegraph || .55)) enemy.telegraph = Math.max(enemy.telegraph, def.telegraph || .55); enemy.telegraph = Math.max(0, enemy.telegraph - dt);
        saveBossState(game, enemy);
    }
    function update(game, dt) {
        const ship = game.state.ship;
        game.enemies.forEach(enemy => {
            if (enemy.hull <= 0) return; const def = definition(enemy.archetype), convoy = game.state.contracts.active?.escort?.convoy;
            enemy.disabled = Math.max(0, (enemy.disabled || 0) - dt); enemy.slowed = Math.max(0, (enemy.slowed || 0) - dt); if (enemy.disabled > 0) return;
            if (enemy.bossType) bossUpdate(game, enemy, def, dt);
            let target = null;
            if (enemy.role === 'escort' && convoy?.hull > 0 && !enemy.aggroed) target = convoy;
            if (!target && hostileToPlayer(game.state, enemy) && !ns.Abilities.isActive(game.state, 'cloak')) target = ship;
            if (!target) target = game.enemies.filter(other => other !== enemy && other.hull > 0 && opposing(enemy.team, other.team)).sort((a, b) => distance(enemy, a) - distance(enemy, b))[0] || null;
            if (!target) { enemy.vx *= Math.pow(.98, dt * 60); enemy.vy *= Math.pow(.98, dt * 60); enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt; return; }
            const a = Math.atan2(target.y - enemy.y, target.x - enemy.x), d = distance(enemy, target), preferred = def.preferredRange || 250; enemy.angle = a;
            let accel = d > preferred + 45 ? def.speed : d < preferred - 45 ? -def.speed * .45 : 0; accel *= enemy.slowed > 0 ? enemy.slowScale : 1; if (enemy.archetype === 'striker' || enemy.bossType === 'void_reaver') accel += Math.sin(game.time * 2 + enemy.x) * def.speed * .4;
            enemy.vx = (enemy.vx + Math.cos(a) * accel * dt) * Math.pow(.985, dt * 60); enemy.vy = (enemy.vy + Math.sin(a) * accel * dt) * Math.pow(.985, dt * 60); enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt; enemy.cooldown -= dt;
            if (def.ability === 'repair' && enemy.specialTimer <= 0) { const ally = game.enemies.filter(other => other !== enemy && other.hull > 0 && other.team === enemy.team && other.hull < other.maxHull).sort((a, b) => distance(enemy, a) - distance(enemy, b))[0]; if (ally && distance(enemy, ally) < 520) { ally.hull = Math.min(ally.maxHull, ally.hull + 30); enemy.specialTimer = 3; game.effects.push({ x: ally.x, y: ally.y, vx: 0, vy: 0, life: .25, maxLife: .25, size: 22, flash: true, color: '#55f0ad' }); } }
            if (def.ability === 'mines' && enemy.specialTimer <= 0) { mine(game, enemy, enemy.angle + Math.PI, 30); enemy.specialTimer = 3.5; }
            enemy.specialTimer = Math.max(0, enemy.specialTimer - dt);
            if (d < 680 && enemy.cooldown <= 0) { enemy.cooldown = def.cooldown * (enemy.bossPhase ? Math.max(.55, 1 - (enemy.bossPhase - 1) * .15) : 1) + Math.random() * .35; if (enemy.archetype === 'torpedo_bomber') fireFan(game, enemy, target, def, 2, .25); else fire(game, enemy, target, def); }
            game.world.nearbyEntities(enemy.x, enemy.y, 90).filter(entity => entity.kind === 'asteroid').forEach(asteroid => game.resolveShipAsteroidCollision(enemy, enemy.radius, asteroid, 'enemy'));
        });
        game.enemies = game.enemies.filter(enemy => enemy.hull > 0 && (enemy.persistent || distance(enemy, ship) < 2600));
    }
    function playerHit(game, enemy, hit) {
        const damage = typeof hit === 'number' ? hit : hit.damage, def = definition(enemy.archetype);
        if (isFaction(enemy.faction) && !enemy.aggroed && ns.Expansion.patrolStatus(game.state, enemy.faction) !== 'HOSTILE') game.state.reputations[enemy.faction] = ns.MathUtil.clamp(game.state.reputations[enemy.faction] - 2, -100, 100);
        enemy.aggroed = true; const component = typeof hit === 'object' && ((def.components || []).find(item => item.id === hit.componentId && (enemy.components?.[item.id] || 0) > 0) || (def.components || []).filter(item => (enemy.components?.[item.id] || 0) > 0).sort((a, b) => distance({ x: enemy.x + a.x, y: enemy.y + a.y }, hit) - distance({ x: enemy.x + b.x, y: enemy.y + b.y }, hit))[0]);
        if (component && distance({ x: enemy.x + component.x, y: enemy.y + component.y }, hit) <= 24) { enemy.components[component.id] = Math.max(0, enemy.components[component.id] - damage); if (enemy.components[component.id] <= 0) game.notify(`${def.name.toUpperCase()} // ${component.name.toUpperCase()} DESTROYED`); return; }
        const applied = enemy.shielded ? damage * .3 : damage; enemy.hull -= applied;
    }
    function killed(game, enemy, byPlayer) {
        if (byPlayer !== false && isFaction(enemy.faction)) game.state.reputations[enemy.faction] = ns.MathUtil.clamp(game.state.reputations[enemy.faction] - 8, -100, 100);
        const def = definition(enemy.archetype), scale = def.reward || 1; return { xp: Math.round((16 + game.region.danger * 4) * scale), aetherium: Math.round((8 + game.region.danger * 3) * scale), helionite: game.region.danger >= 3 ? Math.max(1, Math.round(scale)) : 0 };
    }
    function onRegionEntered(game, region) {
        const progression = game.state.progression, defeated = Object.keys(progression.bossesDefeated || {}).filter(id => ns.Data.BOSSES[id]?.capital);
        if (progression.roamingThreat || region.danger < 5 || game.state.playTime < (progression.nextRoamingThreatAt || 0) || !defeated.length) return null;
        const roll = ns.MathUtil.hash(game.state.worldSeed, region.column, region.row, Math.floor(game.state.playTime / 1800)); if (roll >= .12) return null;
        const bossType = defeated[Math.floor(roll * 1000) % defeated.length], angle = roll * Math.PI * 20, radius = Math.min(region.w, region.h) * .3;
        progression.roamingThreat = { bossType, region: region.id, x: region.x + region.w / 2 + Math.cos(angle) * radius, y: region.y + region.h / 2 + Math.sin(angle) * radius, status: 'signaled', bossState: null };
        progression.nextRoamingThreatAt = game.state.playTime + 1800; return progression.roamingThreat;
    }
    function updateRoaming(game) {
        const threat = game.state.progression?.roamingThreat; if (!threat || threat.region !== game.region.id) return null;
        if (threat.status === 'active' && !game.enemies.some(enemy => enemy.roaming && enemy.hull > 0)) threat.status = 'signaled';
        if (threat.status === 'active' || distance(game.state.ship, threat) > 900) return null;
        threat.status = 'active'; const boss = spawnBoss(game, { bossType: threat.bossType, target: threat, encounterId: `roaming:${threat.bossType}:${threat.region}`, bossState: threat.bossState, roaming: true }); boss.roaming = true; game.notify(`${definition(threat.bossType).name.toUpperCase()} // ROAMING CAPITAL ENGAGED`); return boss;
    }
    function completeRoaming(game, enemy) {
        const threat = game.state.progression?.roamingThreat; if (!enemy?.roaming || threat?.bossType !== enemy.bossType) return false;
        const def = definition(enemy.bossType); ns.Wallet.credit(game.state, { aetherium: Math.round(900 * .6), sunshards: Math.round(18 * .6), helionite: Math.round(55 * .6) }); game.state.progression.roamingThreat = null; game.notify(`${def.name.toUpperCase()} // ROAMING THREAT ELIMINATED`); return true;
    }
    ns.Encounters = { definition, hostileToPlayer, opposing, create, spawn, spawnBoss, update, playerHit, killed, componentAlive, onRegionEntered, updateRoaming, completeRoaming };
})(window.MiniInvadersV2);
