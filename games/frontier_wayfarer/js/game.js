(function (ns) {
    const { clamp, distance, circlesOverlap } = ns.MathUtil;
    const { LANDMARKS, MODULES } = ns.Data;

    class Game {
        constructor(canvas, ui) {
            this.canvas = canvas; this.ui = ui; this.input = new ns.Input(window); this.renderer = new ns.Renderer(canvas);
            this.state = null; this.world = null; this.region = ns.Data.REGIONS[0]; this.camera = { x: 0, y: 0, zoom: 1 }; this.lightSpeed = ns.LightSpeed.createState();
            this.bullets = []; this.enemies = []; this.effects = []; this.time = 0; this.running = false; this.paused = false; this.last = 0; this.accumulator = 0;
            this.weaponCooldowns = { primary1: 0, primary2: 0 }; this.enemySpawnedFor = null; this.autosaveTimer = 0; this.uiTimer = 0; this.messageTimer = 0; this.encounterTimer = 18; this.collisionGuards = new Map(); this.impactShake = 0;
            this.interactionCast = null; this.weaponCharges = {}; this.weaponLocks = {}; this.weaponRamps = {}; this.lastWeaponShot = null; this.bulkheadsUsed = false; this.contractWarningTimer = 0; this.blinkEffect = null;
            this.random = new ns.Runtime.SimulationRandom(1); this.runtime = new ns.Runtime.RuntimePipeline(ns.Runtime.defaultSystems()); this.entitySerial = 0; this.deathCinematic = null; this.defeatPromptTimer = 0;
            this.loop = this.loop.bind(this); this.onResize = () => this.renderer.resize(); window.addEventListener('resize', this.onResize);
        }
        newCareer() { ns.Save.remove(); this.useState(ns.State.createState()); this.save(); this.ui.hideStart(); this.running = true; this.paused = false; this.last = performance.now(); requestAnimationFrame(this.loop); if (this.state.dockedAt) this.ui.openPanel(this, 'station'); this.notify('WAYFARER ONLINE // FREE PILOT LICENSE ISSUED'); }
        continueCareer() { const state = ns.Save.load(); if (!state) return this.newCareer(); this.useState(state); this.save(); this.ui.hideStart(); this.running = true; this.paused = false; this.last = performance.now(); requestAnimationFrame(this.loop); if (this.state.dockedAt) this.ui.openPanel(this, 'station'); this.notify('CAREER RESTORED'); }
        useState(state) {
            if (!('customWaypoint' in state)) state.customWaypoint = null;
            ns.Galaxies.ensureState(state); ns.StationWar.ensure(state); ns.Objectives.ensure(state); ns.Objectives.definitionsFor(state, state.galaxyId); const galaxySeed = ns.Galaxies.worldSeed(state);
            this.state = state; this.world = new ns.World.WorldService(galaxySeed, state.consumedEntityIds, ns.Galaxies.worldConfig(state)); this.region = this.world.update(state.ship.x, state.ship.y);
            this.random = new ns.Runtime.SimulationRandom(galaxySeed ^ 0x57a1f4); this.entitySerial = 0; this.runtime.init(this);
            this.camera.x = state.ship.x; this.camera.y = state.ship.y; this.camera.zoom = 1; this.lightSpeed = ns.LightSpeed.createState(); this.bullets = []; this.enemies = []; this.effects = []; this.collisionGuards.clear(); this.impactShake = 0; this.interactionCast = null; this.weaponCharges = {}; this.weaponLocks = {}; this.weaponRamps = {}; this.lastWeaponShot = null; this.bulkheadsUsed = false; this.contractWarningTimer = 0; this.blinkEffect = null; this.deathCinematic = null; if (this.defeatPromptTimer) { clearTimeout(this.defeatPromptTimer); this.defeatPromptTimer = 0; }
            const stats = ns.Progression.calculateShipStats(state); state.ship.hull = clamp(state.ship.hull, 0, stats.hull); state.ship.shield = clamp(state.ship.shield, 0, stats.shield); state.ship.energy = clamp(state.ship.energy, 0, stats.reactor);
            if (state.dockedAt) { const station = ns.Galaxies.landmarkById(state, state.dockedAt); if (station) ns.Economy.ensureMarket(state, station); }
            this.ui.renderAll(this);
        }
        loop(now) {
            if (!this.running) return;
            const elapsed = Math.min(.1, (now - this.last) / 1000 || 0); this.last = now; this.accumulator += elapsed;
            const interfaceHandled = this.processInterfaceInput();
            if (this.deathCinematic && !this.deathCinematic.promptOpen) this.deathCinematic.elapsed = Math.min(this.deathCinematic.duration, this.deathCinematic.elapsed + elapsed);
            const step = 1 / 60; let stepped = false;
            while (this.accumulator >= step) { if (this.deathCinematic && !this.deathCinematic.promptOpen) this.updateDeathCinematic(step); else if (!this.paused) this.update(step); this.accumulator -= step; stepped = true; }
            this.renderer.render(this); this.ui.updateHud(this); if ((stepped && !this.paused) || interfaceHandled || (stepped && this.paused)) this.input.endFrame(); requestAnimationFrame(this.loop);
        }
        processInterfaceInput() {
            if (!this.state) return false;
            if (this.deathCinematic && !this.deathCinematic.promptOpen) return false;
            const travel = ns.LightSpeed.ensure(this); let handled = false;
            if (travel.phase === 'idle') {
                [['Escape', 'pause'], ['m', 'navigation'], ['t', 'traits'], ['c', 'contracts']].some(([key, tab]) => {
                    if (!this.input.consume(key)) return false;
                    this.cancelInteraction(true);
                    this.ui.togglePanel(this, tab); handled = true; return true;
                });
            }
            return handled;
        }
        update(dt) {
            if (this.processInterfaceInput()) return;
            this.time += dt; this.state.playTime += dt; this.autosaveTimer += dt; this.uiTimer += dt; this.messageTimer -= dt;
            const travel = ns.LightSpeed.ensure(this);
            if (this.input.consume('r')) ns.LightSpeed.toggle(this);
            const previousRegion = this.region.id;
            if (travel.phase === 'charging') {
                ns.Abilities.update(this, dt); this.world.updateAsteroids(dt); ns.LightSpeed.update(this, dt);
                if (travel.phase === 'charging') {
                    this.region = this.world.update(this.state.ship.x, this.state.ship.y); this.handleAsteroidCollisions(dt);
                    this.updateBullets(dt); this.updateEnemies(dt); this.updateEffects(dt); this.updateContract(dt);
                }
            } else if (ns.LightSpeed.isShifted(this)) {
                ns.LightSpeed.update(this, dt); this.region = ns.World.regionAt(this.state.ship.x, this.state.ship.y, this.world?.config); this.updateContractClock(dt);
            } else {
                ns.LightSpeed.update(this, dt); ns.Abilities.update(this, dt); this.world.updateAsteroids(dt); this.updateShip(dt); this.updateInteraction(dt); this.updateBullets(dt); this.updateEnemies(dt); this.updateEffects(dt); this.updateContract(dt);
                this.region = this.world.update(this.state.ship.x, this.state.ship.y);
                ns.WorldEvents.update(this);
                ns.Encounters.updateRoaming(this);
                ns.StationWar.update(this);
                this.chartNearbyLandmarks();
            }
            if (previousRegion !== this.region.id) {
                if (!this.state.visitedRegions.includes(this.region.id)) this.state.visitedRegions.push(this.region.id);
                const threat = ns.Encounters.onRegionEntered(this, this.region);
                this.notify(threat ? `CAPITAL THREAT DETECTED // ${ns.Data.BOSSES[threat.bossType].name.toUpperCase()} // OPTIONAL CONTACT MARKED` : `ENTERING ${this.region.name.toUpperCase()}`);
            }
            this.runtime.update(this, dt);
            this.camera.zoom = travel.zoom; this.camera.x += (this.state.ship.x - this.camera.x) * Math.min(1, dt * (ns.LightSpeed.isShifted(this) ? 12 : 5)); this.camera.y += (this.state.ship.y - this.camera.y) * Math.min(1, dt * (ns.LightSpeed.isShifted(this) ? 12 : 5));
            if (this.uiTimer >= .2) this.uiTimer = 0;
        }
        updateDeathCinematic(dt) {
            const death = this.deathCinematic; if (!death) return;
            this.time += dt; this.messageTimer -= dt; this.world.updateAsteroids(dt); this.updateEffects(dt);
            this.bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }); this.bullets = this.bullets.filter(b => b.life > 0);
            this.enemies.forEach(e => { e.x += (e.vx || 0) * dt; e.y += (e.vy || 0) * dt; e.angle = (e.angle || 0) + (e.turn || 0) * dt; });
            this.region = this.world.update(death.snapshot.x, death.snapshot.y);
            this.camera.zoom = 1; this.camera.x += (death.snapshot.x - this.camera.x) * Math.min(1, dt * 7); this.camera.y += (death.snapshot.y - this.camera.y) * Math.min(1, dt * 7);
        }
        setCustomWaypoint(point) {
            const bounds = this.world?.config?.bounds || ns.World.WORLD_BOUNDS;
            const candidate = { x: clamp(point.x, bounds.minX, bounds.maxX), y: clamp(point.y, bounds.minY, bounds.maxY) };
            if (!ns.World.containsPoint(candidate.x, candidate.y, this.world.config)) { this.notify('NO NAVIGABLE SECTOR'); return null; }
            this.state.customWaypoint = candidate;
            this.save(); this.notify('CUSTOM WAYPOINT SET'); return this.state.customWaypoint;
        }
        clearCustomWaypoint(message) {
            if (!this.state.customWaypoint) return false;
            this.state.customWaypoint = null; this.save(); if (message) this.notify(message); return true;
        }
        updateCustomWaypoint() {
            if (this.state.customWaypoint && distance(this.state.ship, this.state.customWaypoint) <= 220) this.clearCustomWaypoint('CUSTOM WAYPOINT REACHED');
        }
        updateShip(dt) {
            const s = this.state.ship, stats = ns.Progression.calculateShipStats(this.state); const overweight = stats.mass > stats.massLimit ? .5 : 1;
            const shipScreen = this.renderer.screen(s, this.camera);
            s.angle = ns.MathUtil.angleToPointer(this.input.mouse, { w: this.renderer.w, h: this.renderer.h }, s.angle, shipScreen);
            let thrust = 0; if (this.input.down('w', 'ArrowUp')) thrust += 1; if (this.input.down('s', 'ArrowDown')) thrust -= .55;
            const afterburner = ns.Abilities.isActive(this.state, 'afterburner') || ns.Abilities.isActive(this.state, 'ghostVector'), effects = s.abilityEffects || {};
            const thrustScale = ns.Abilities.isActive(this.state, 'afterburner') ? (effects.afterburnerThrustScale || 2.1) : 2.1;
            const speedScale = ns.Abilities.isActive(this.state, 'afterburner') ? (effects.afterburnerSpeedScale || 1.82) : 1.82;
            const force = stats.thrust * (afterburner ? thrustScale : 1) * overweight; s.vx += Math.cos(s.angle) * thrust * force * dt; s.vy += Math.sin(s.angle) * thrust * force * dt;
            const strafe = (this.input.down('d', 'ArrowRight') ? 1 : 0) - (this.input.down('a', 'ArrowLeft') ? 1 : 0);
            const strafeForce = force * .55 * stats.strafeScale * (1 + (stats.effects.strafe || 0));
            s.vx += Math.cos(s.angle + Math.PI / 2) * strafe * strafeForce * dt; s.vy += Math.sin(s.angle + Math.PI / 2) * strafe * strafeForce * dt;
            const drag = Math.pow(.992, dt * 60 * stats.braking); s.vx *= drag; s.vy *= drag; const speed = Math.hypot(s.vx, s.vy), maxSpeed = afterburner ? stats.maxSpeed * speedScale : stats.maxSpeed;
            if (speed > maxSpeed) { s.vx *= maxSpeed / speed; s.vy *= maxSpeed / speed; }
            s.x += s.vx * dt; s.y += s.vy * dt; this.state.stats.distance += speed * dt;
            const exposure = ns.World.boundaryExposure(s.x, s.y, this.world?.config);
            if (exposure.active) {
                if (ns.Combat.applyHullDamage(this.state, Math.min(180, 32 + exposure.depth * .16) * dt)) return this.onDefeat();
                if (this.messageTimer <= 0) this.notify('NEBULA BREACH // HULL FAILURE IMMINENT');
            }
            s.energy = Math.min(stats.reactor, s.energy + stats.energyRecharge * dt); s.heat = Math.max(0, s.heat - stats.cooling * dt);
            s.shieldRechargeDelay = Math.max(0, (s.shieldRechargeDelay || 0) - dt);
            if (s.shieldRechargeDelay <= 0) s.shield = Math.min(stats.shield, s.shield + stats.shieldRecharge * dt);
            if (stats.effects.fieldRepair && this.enemies.length === 0) s.hull = Math.min(stats.hull, s.hull + stats.effects.fieldRepair * dt);
            if (stats.effects.bulkheads && !this.bulkheadsUsed && s.hull > 0 && s.hull <= stats.hull * .3) { this.bulkheadsUsed = true; s.hull = Math.min(stats.hull, s.hull + stats.hull * .12); s.abilityEffects.damageResistance = 5; this.notify('EMERGENCY BULKHEADS // DAMAGE CONTROL ACTIVE'); }
            Object.keys(this.weaponCooldowns).forEach(slot => { this.weaponCooldowns[slot] -= dt; });
            ns.Weapons.control(this, 'primary1', this.input.mouse.primary, dt);
            ns.Weapons.control(this, 'primary2', this.input.mouse.secondary, dt);
            if (this.input.consume('f')) this.interact();
            Object.entries(ns.Abilities.KEY_SLOTS).forEach(([key, slot]) => { if (this.input.consume(key)) ns.Abilities.activate(this, slot); });
            if (this.input.consume('Tab')) this.selectTarget();
            this.handleAsteroidCollisions(dt);
        }
        handleAsteroidCollisions(dt) {
            const s = this.state.ship;
            const radius = ns.Progression.calculateShipStats(this.state).radius; this.world.nearbyEntities(s.x, s.y, 90 + radius).filter(e => e.kind === 'asteroid').forEach(e => this.resolveShipAsteroidCollision(s, radius, e, 'player'));
            if (s.hull <= 0) this.onDefeat();
        }
        resolveShipAsteroidCollision(body, radius, asteroid, kind) {
            const dx = body.x - asteroid.x, dy = body.y - asteroid.y, minDistance = radius + asteroid.radius, d = Math.hypot(dx, dy);
            if (d > minDistance) return false;
            const nx = d > .001 ? dx / d : 1, ny = d > .001 ? dy / d : 0, penetration = minDistance - d + .01;
            body.x += nx * penetration; body.y += ny * penetration;
            const relativeNormal = (body.vx - asteroid.vx) * nx + (body.vy - asteroid.vy) * ny, closingSpeed = Math.max(0, -relativeNormal);
            if (closingSpeed > 0) {
                const impulse = closingSpeed * 1.45; body.vx += nx * impulse; body.vy += ny * impulse;
                asteroid.vx -= nx * impulse * .15; asteroid.vy -= ny * impulse * .15;
            }
            const key = `${kind}:${body.id || 'wayfarer'}:${asteroid.id}`;
            if (closingSpeed > 35 && (this.collisionGuards.get(key) || 0) <= this.time) {
                this.collisionGuards.set(key, this.time + .3); const resistance = kind === 'player' ? ns.Progression.calculateShipStats(this.state).collisionResistance : 0, shipDamage = (closingSpeed - 35) * .12 * (1 - resistance);
                if (kind === 'player') ns.Combat.applyDamage(this.state, shipDamage); else { body.hull -= shipDamage; if (body.hull <= 0) this.onEnemyKilled(body, false); }
                const result = this.world.damageAsteroid(asteroid, shipDamage * .65); this.handleAsteroidResult?.(result); this.spawnImpact({ x: body.x - nx * radius, y: body.y - ny * radius, vx: asteroid.vx, vy: asteroid.vy }, result.destroyed ? 16 : 9); this.impactShake = Math.max(this.impactShake, Math.min(8, shipDamage * .15));
            }
            return true;
        }
        fire(slot) { return ns.Weapons.fire(this, slot); }
        weaponMuzzle(slot, module) {
            return ns.MathUtil.weaponHardpoint(this.state.ship, slot, module);
        }
        updateBullets(dt) {
            for (const b of this.bullets) {
                ns.Weapons.updateProjectile(this, b, dt);
                const from = { x: b.x, y: b.y }, to = { x: b.x + b.vx * dt, y: b.y + b.vy * dt }; b.life -= dt;
                const candidates = this.world.loadedEntities().filter(entity => entity.kind === 'asteroid').map(target => ({ kind: 'asteroid', target, t: ns.MathUtil.segmentCircleHit(from, to, target, b.radius) })).filter(hit => hit.t !== null);
                if (b.enemy) {
                    const player = { x: this.state.ship.x, y: this.state.ship.y, radius: ns.Progression.calculateShipStats(this.state).radius };
                    if (b.targetPlayer !== false && (!b.ownerTeam || b.ownerTeam === 'bandits' || ns.Expansion.patrolStatus(this.state, b.ownerTeam) === 'HOSTILE')) candidates.push({ kind: 'player', target: player, t: ns.MathUtil.segmentCircleHit(from, to, player, b.radius) });
                    const convoy = this.state.contracts.active?.escort?.convoy; if (convoy?.hull > 0 && ns.Encounters.opposing(b.ownerTeam || 'bandits', convoy.faction || 'independents')) candidates.push({ kind: 'convoy', target: convoy, t: ns.MathUtil.segmentCircleHit(from, to, convoy, b.radius) });
                    this.enemies.filter(enemy => enemy.hull > 0 && ns.Encounters.opposing(b.ownerTeam, enemy.team)).forEach(target => candidates.push({ kind: 'npc', target, t: ns.MathUtil.segmentCircleHit(from, to, target, b.radius) }));
                } else this.enemies.filter(enemy => enemy.hull > 0 && !ns.StationWar.isPlayerAlly(this.state, enemy) && !(b.hitIds || []).includes(enemy.id)).forEach(target => {
                    const components = ns.Data.BOSSES[target.bossType]?.components || [];
                    candidates.push({ kind: 'enemy', target, t: ns.Geometry.segmentPolygonHit(from, to, target, b.radius) });
                    components.filter(component => (target.components?.[component.id] || 0) > 0).forEach(component => { const componentPoint = ns.Geometry.componentPoint(target, component); candidates.push({ kind: 'component', target, component, t: ns.MathUtil.segmentCircleHit(from, to, componentPoint, b.radius) }); });
                });
                const hit = candidates.filter(item => item.t !== null).sort((a, b2) => a.t - b2.t)[0];
                if (!hit) { b.x = to.x; b.y = to.y; continue; }
                b.x = from.x + (to.x - from.x) * hit.t; b.y = from.y + (to.y - from.y) * hit.t; const piercing = hit.kind === 'enemy' && b.pierce > 0; if (!piercing) b.life = 0; else { b.pierce--; b.hitIds.push(hit.target.id); }
                if (hit.kind === 'asteroid') { const result = this.world.damageAsteroid(hit.target, b.damage); this.handleAsteroidResult?.(result); this.spawnImpact(hit.target, result.destroyed ? 10 : 4); }
                else if (hit.kind === 'player') { if (ns.Combat.applyDamage(this.state, b.damage)) this.onDefeat(); }
                else if (hit.kind === 'convoy') hit.target.hull = Math.max(0, hit.target.hull - b.damage);
                else if (hit.kind === 'npc') { hit.target.hull -= b.damage; if (hit.target.hull <= 0) this.onEnemyKilled(hit.target, false); }
                else { if (hit.component) b.componentId = hit.component.id; this.onPlayerHitEnemy(hit.target, b); ns.Weapons.playerHit(this, b, hit.target); if (hit.target.hull <= 0) this.onEnemyKilled(hit.target); }
            }
            this.bullets = this.bullets.filter(b => b.life > 0);
        }
        spawnImpact(source, count) {
            this.effects.push({ x: source.x, y: source.y, vx: 0, vy: 0, life: .16, maxLife: .16, size: 16 + count, flash: true });
            for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2, speed = 25 + Math.random() * 85; this.effects.push({ x: source.x, y: source.y, vx: source.vx * .25 + Math.cos(angle) * speed, vy: source.vy * .25 + Math.sin(angle) * speed, life: .25 + Math.random() * .45, maxLife: .7, size: 1 + Math.random() * 3 }); }
        }
        handleAsteroidResult(result) {
            const asteroid = result?.destroyed && result.asteroid; if (!asteroid) return null;
            const chance = { large: .12, medium: .2, small: .32 }[asteroid.tier] || 0; if (!this.random.chance(chance)) return null;
            const roll = this.random.next(), reward = roll < .7 ? { aetherium: Math.floor(this.random.range(2, 8)) } : roll < .93 ? { sunshards: Math.floor(this.random.range(1, 4)) } : { helionite: 1 };
            return this.world.spawnTransient({ id: this.nextEntityId('mineral'), kind: 'worldObject', typeId: 'mineral_chunk', name: 'Mineral Fragment', x: asteroid.x, y: asteroid.y, vx: asteroid.vx * .3, vy: asteroid.vy * .3, radius: 12, region: this.region.id, reward });
        }
        updateEffects(dt) { this.effects.forEach(effect => { effect.x += effect.vx * dt; effect.y += effect.vy * dt; effect.rotation = (effect.rotation || 0) + (effect.spin || 0) * dt; effect.life -= dt; }); this.effects = this.effects.filter(effect => effect.life > 0); if (this.blinkEffect) { this.blinkEffect.life -= dt; if (this.blinkEffect.life <= 0) this.blinkEffect = null; } this.impactShake = Math.max(0, this.impactShake - dt * 24); }
        spawnEnemies(count, center, faction, role, archetype) { return ns.Encounters.spawn(this, count, center, faction, role, archetype); }
        nextEntityId(prefix) { this.entitySerial++; return `${prefix}:${this.state.worldSeed}:${this.entitySerial}`; }
        updateEnemies(dt) { ns.Encounters.update(this, dt); }
        onPlayerHitEnemy(enemy, hit) { ns.Encounters.playerHit(this, enemy, hit); }
        spawnEnemyDeath(enemy) {
            if (!enemy) return; const factionColor = ns.Data.FACTIONS[enemy.faction]?.color || '#ff8b59', pieces = ns.Geometry.fragments(enemy), life = enemy.bossType ? 2.1 : enemy.radius >= 18 ? 1.15 : .75;
            pieces.forEach((fragment, index) => { const angle = index / pieces.length * Math.PI * 2 + (enemy.angle || 0), speed = (enemy.bossType ? 55 : 75) + this.random.range(0, enemy.bossType ? 90 : 120); this.effects.push({ x: enemy.x, y: enemy.y, vx: enemy.vx * .35 + Math.cos(angle) * speed, vy: enemy.vy * .35 + Math.sin(angle) * speed, life, maxLife: life, fragment, fragmentScale: ns.Geometry.scale(enemy), rotation: (enemy.angle || 0) + Math.PI / 2, spin: this.random.range(-4, 4), color: factionColor }); });
            this.effects.push({ x: enemy.x, y: enemy.y, vx: 0, vy: 0, life: enemy.bossType ? .55 : .25, maxLife: enemy.bossType ? .55 : .25, size: enemy.radius * (enemy.bossType ? 2.2 : 1.4), flash: true, color: factionColor });
            if (!enemy.bossType) return;
            const def = ns.Data.BOSSES[enemy.bossType], salvageChance = def.capital ? .7 : enemy.bossType === 'marauder_carrier' ? .5 : .35; if (!this.random.chance(salvageChance)) return;
            const reward = def.capital ? { aetherium: Math.floor(this.random.range(100, 161)), sunshards: Math.floor(this.random.range(2, 6)), helionite: Math.floor(this.random.range(2, 5)) } : { aetherium: Math.floor(this.random.range(55, 101)), sunshards: Math.floor(this.random.range(1, 4)), helionite: 1 };
            this.world.spawnTransient({ id: this.nextEntityId('capital-salvage'), kind: 'worldObject', typeId: 'capital_salvage', name: `${def.name} Salvage`, x: enemy.x, y: enemy.y, vx: enemy.vx * .2, vy: enemy.vy * .2, radius: 22, region: this.region.id, reward });
        }
        onEnemyKilled(enemy, byPlayer) { if (enemy?.rewarded) return; if (enemy) enemy.rewarded = true; this.spawnEnemyDeath(enemy); const playerKill = byPlayer !== false, reward = ns.Encounters.killed(this, enemy, playerKill); if (!playerKill) return; ns.StationWar.notePlayerKill(this, enemy); this.state.stats.kills++; ns.Objectives.record(this.state, 'kills', 1); if (enemy?.bossType) ns.Objectives.record(this.state, 'bosses', 1); ns.State.addExperience(this.state, reward.xp); ns.Contracts.recordProgress(this.state, 'kill', 1, enemy); ns.Encounters.completeRoaming(this, enemy); ns.Progression.updateAchievements(this.state); ns.Wallet.credit(this.state, { aetherium: reward.aetherium, helionite: reward.helionite }); }
        updateContractClock(dt) { const c = this.state.contracts.active; if (c && ns.Contracts.updateTimer(this.state, dt)) this.notify(c.timer.hard ? 'HARD DEADLINE MISSED // CURRENCY PAYMENT FORFEITED' : 'DEADLINE MISSED // BONUS PAYMENT EXPIRED'); }
        updateContract(dt) {
            const c = this.state.contracts.active; if (!c) { this.enemySpawnedFor = null; return; }
            this.contractWarningTimer = Math.max(0, this.contractWarningTimer - dt);
            this.updateContractClock(dt);
            const dockingWarning = ns.Contracts.dockingWarning(this.state);
            if (dockingWarning && this.contractWarningTimer <= 0) { this.notify(dockingWarning.message); this.contractWarningTimer = 5; }
            const revealed = ns.Contracts.revealSearches(this.state, this.state.ship);
            if (revealed.length) this.notify('SEARCH CONTACT RESOLVED // EXACT WAYPOINT LOCKED');
            const near = distance(this.state.ship, c.target) < 720, combatStage = ns.Contracts.activeStages(c).find(stage => stage.event === 'kill'), combatCount = combatStage?.required || c.required;
            if (['bounty', 'assault'].includes(c.type) && this.enemySpawnedFor === c.id && this.enemies.length === 0 && c.progress < c.required) this.enemySpawnedFor = null;
            if (near && ['bounty', 'assault'].includes(c.type) && this.enemySpawnedFor !== c.id) { if (c.bossType) { ns.Encounters.spawnBoss(this, c); this.notify(`${ns.Data.BOSSES[c.bossType].name.toUpperCase()} // PRIORITY TARGET CONFIRMED`); } else { const faction = c.type === 'assault' ? (c.enemyFaction || ns.Data.FACTIONS[c.issuer]?.hostileTo?.[0]) : null; this.spawnEnemies(combatCount, c.target, faction); } this.enemySpawnedFor = c.id; }
            if (c.escort) {
                const config = ns.Contracts.ESCORT_CONFIG, escort = c.escort;
                if (escort.phase === 'rendezvous' && distance(this.state.ship, escort.start) <= config.activationRange) {
                    const convoy = ns.Contracts.startEscort(this.state); this.spawnEnemies(2 + c.risk, convoy, null, 'escort'); escort.ambushes = 1; this.notify('CONVOY LINKED // ESCORT FORMATION ACTIVE');
                }
                if (escort.phase === 'traveling') {
                    const convoy = escort.convoy;
                    if (!convoy || convoy.hull <= 0) return this.failEscort('CONVOY DESTROYED');
                    const separation = distance(this.state.ship, convoy), playerSpeed = Math.hypot(this.state.ship.vx, this.state.ship.vy), maxSpeed = ns.Progression.calculateShipStats(this.state).maxSpeed, desiredSpeed = separation <= config.formationRange ? Math.max(config.speed, Math.min(maxSpeed, playerSpeed)) : config.speed;
                    escort.speed = (escort.speed || config.speed) + (desiredSpeed - (escort.speed || config.speed)) * Math.min(1, dt * 2.5);
                    const routeAngle = Math.atan2(escort.end.y - convoy.y, escort.end.x - convoy.x), remaining = distance(convoy, escort.end), step = Math.min(remaining, escort.speed * dt);
                    convoy.vx = Math.cos(routeAngle) * escort.speed; convoy.vy = Math.sin(routeAngle) * escort.speed; convoy.angle = routeAngle; convoy.x += Math.cos(routeAngle) * step; convoy.y += Math.sin(routeAngle) * step; c.target = { x: convoy.x, y: convoy.y }; const escortStage = ns.Contracts.activeStages(c).find(stage => stage.escort); if (escortStage) escortStage.target = { x: convoy.x, y: convoy.y };
                    escort.grace = separation <= config.escortRange ? config.graceSeconds : escort.grace - dt;
                    if (separation <= config.escortRange) escort.linkCriticalWarned = false;
                    const hullRatio = convoy.hull / convoy.maxHull;
                    if (hullRatio <= config.lowHullRatio && !escort.lowHullWarned) { this.notify(`CONVOY HULL CRITICAL // ${Math.ceil(hullRatio * 100)}%`); escort.lowHullWarned = true; this.contractWarningTimer = 4; }
                    else if (escort.grace < 4 && !escort.linkCriticalWarned) { this.notify(`ESCORT LINK CRITICAL // ${escort.grace.toFixed(1)} SEC REMAINING`); escort.linkCriticalWarned = true; this.contractWarningTimer = 4; }
                    else if (this.contractWarningTimer <= 0 && separation > config.warningRange) { this.notify(`CONVOY SEPARATION WARNING // ${Math.round(separation)} KM`); this.contractWarningTimer = 4; }
                    if (escort.grace <= 0) return this.failEscort('ESCORT LINK LOST');
                    const routeLength = Math.max(1, distance(escort.start, escort.end)), traveled = distance(escort.start, convoy);
                    if (escort.ambushes < 2 && traveled / routeLength >= .5) { this.spawnEnemies(2 + c.risk, convoy, null, 'escort'); escort.ambushes = 2; this.notify('CONVOY AMBUSH // HOSTILES INBOUND'); }
                    if (remaining <= 20) { escort.phase = 'arrived'; ns.Contracts.recordProgress(this.state, 'escort', 1, convoy); }
                }
            }
            if (ns.Contracts.isComplete(c)) { const completed = ns.Contracts.complete(this.state); if (completed) { this.save(); this.notify('CONTRACT COMPLETE // REWARDS SECURED'); this.ui.renderAll(this); } }
        }
        failEscort(reason) { const failed = ns.Contracts.fail(this.state, reason); if (failed) { this.save(); this.notify(`CONTRACT FAILED // ${reason}`); this.ui.renderAll(this); } return failed; }
        interactionDuration(target, source) {
            if (source === 'world') return ['worldObject', 'worldScenario'].includes(target.kind) ? ns.WorldEvents.interactionDuration(target) : target.kind === 'salvage' ? 3 : 5;
            return ['pickup', 'rescue', 'salvage'].includes(target.event) ? 4 : 5;
        }
        startInteraction(target, source) {
            if (!target) return false;
            if (this.interactionCast?.id === target.id) return true;
            const duration = this.interactionDuration(target, source) * (ns.Progression.traitEffects(this.state).fieldSavant ? .6 : 1);
            this.interactionCast = { id: target.id, source, name: target.name || target.kind, duration, progress: 0, grace: 0, damageSerial: this.state.ship.damageSerial || 0 };
            this.notify(`INTERACTION LINK // ${String(this.interactionCast.name).toUpperCase()} // ${duration.toFixed(0)} SEC`);
            return true;
        }
        cancelInteraction(silent) {
            if (!this.interactionCast) return false;
            this.interactionCast = null;
            if (!silent) this.notify('INTERACTION LINK LOST');
            return true;
        }
        interactionTarget(cast) {
            if (!cast) return null;
            if (cast.source === 'contract') return ns.Contracts.contactsFor(this.state.contracts.active).find(item => item.id === cast.id) || null;
            return this.world.loadedEntities().find(item => item.id === cast.id) || null;
        }
        updateInteraction(dt) {
            const cast = this.interactionCast; if (!cast) return;
            if (this.state.dockedAt || ns.LightSpeed.isTraveling(this) || this.ui.panel.classList.contains('active') || (this.state.ship.damageSerial || 0) !== cast.damageSerial) return void this.cancelInteraction();
            const target = this.interactionTarget(cast); if (!target) return void this.cancelInteraction(true);
            if (ns.Interactions.inRange(this.state, target, this.state.ship)) { cast.grace = 0; cast.progress += dt; }
            else { cast.grace += dt; if (cast.grace > .75) return void this.cancelInteraction(); }
            if (cast.progress >= cast.duration) this.completeInteraction(target, cast.source);
        }
        completeInteraction(target, source) {
            this.interactionCast = null;
            if (source === 'contract') {
                const done = ns.Contracts.recordProgress(this.state, target.event, 1, target);
                if (done) { const completed = ns.Contracts.complete(this.state); if (completed) this.save(); }
                this.notify(`CONTRACT CONTACT SECURED // ${target.name.toUpperCase()}`); this.ui.renderAll(this); return true;
            }
            if (target.kind === 'worldObject') {
                const liveTarget = this.world.loadedEntities().find(entity => entity.id === target.id);
                if (!liveTarget || !ns.WorldEvents.interact(this, liveTarget)) { this.notify('INTERACTION LINK LOST'); return false; }
                ns.Progression.updateAchievements(this.state); this.save(); this.ui.renderAll(this); return true;
            }
            if (target.kind === 'worldScenario') return ns.WorldEvents.activate(this, target);
            if (['signal', 'salvage', 'anomaly'].includes(target.kind) && !this.world.consumeEntity(this.state, target)) return false;
            const fresh = this.world.discover(this.state, target);
            if (target.kind === 'salvage') { const effects = ns.Progression.traitEffects(this.state), gain = Math.round(35 * (1 + (effects.salvage || 0))), premium = effects.fieldSavant ? 2 : 1; ns.Wallet.credit(this.state, { aetherium: gain, sunshards: premium }); this.notify(`SALVAGE RECOVERED // +${gain} AETHERIUM // +${premium} SUNSHARDS`); }
            else if (target.kind === 'anomaly') { const gain = Math.round(8 * (1 + (ns.Progression.traitEffects(this.state).discoveryReward || 0))); ns.Wallet.credit(this.state, { aetherium: 40, sunshards: gain }); ns.State.addExperience(this.state, 45); this.notify(`BEACON LOGGED // +${gain} SUNSHARDS`); }
            else if (fresh) { const gain = Math.round(8 * (1 + (ns.Progression.traitEffects(this.state).discoveryReward || 0))); ns.Wallet.credit(this.state, { aetherium: 40, sunshards: gain }); ns.State.addExperience(this.state, 45); this.notify(`DISCOVERY LOGGED // +${gain} SUNSHARDS`); }
            ns.Progression.updateAchievements(this.state); this.save(); this.ui.renderAll(this); return true;
        }
        chartNearbyLandmarks() {
            const discovered = this.world.config.landmarks.filter(item => ['station', 'anomaly'].includes(item.type) && !this.state.discoveries.includes(item.id) && distance(item, this.state.ship) <= 600);
            if (!discovered.length) return;
            discovered.forEach(item => this.state.discoveries.push(item.id)); this.save();
            if (this.ui?.activeTab === 'navigation' && this.ui.panel.classList.contains('active')) this.ui.renderPanel(this);
            this.notify(`${discovered[0].type === 'station' ? 'STATION' : 'POI'} CHARTED // ${discovered[0].name.toUpperCase()}`);
        }
        chartNearbyStations() { return this.chartNearbyLandmarks(); }
        interact() {
            const available = this.availableInteraction(); if (!available) { this.notify('NO INTERACTION IN RANGE'); return; }
            if (available.target.kind === 'station') return this.dock(available.target);
            return this.startInteraction(available.target, available.source);
        }
        availableInteraction() {
            if (!this.state || this.state.dockedAt || ns.LightSpeed.isTraveling(this)) return null;
            const ship = this.state.ship, contact = ns.Contracts.contactsFor(this.state.contracts.active).filter(item => ns.Interactions.inRange(this.state, item, ship)).sort((a, b) => distance(a, ship) - distance(b, ship))[0];
            if (contact) return { target: contact, source: 'contract', verb: 'CONTRACT' };
            const priority = entity => entity.kind === 'worldObject' ? 0 : entity.kind === 'worldScenario' ? 1 : ['signal', 'salvage', 'anomaly'].includes(entity.kind) ? 2 : 3;
            const target = this.world.nearbyEntities(ship.x, ship.y, 240).filter(entity => entity.kind === 'station' || ['signal', 'salvage', 'anomaly', 'worldObject'].includes(entity.kind) || (entity.kind === 'worldScenario' && ns.WorldEvents.scenarioDefinition(entity)?.requiresInteraction)).filter(entity => ns.Interactions.inRange(this.state, entity, ship)).sort((a, b) => priority(a) - priority(b) || distance(a, ship) - distance(b, ship))[0];
            if (!target) return null;
            return { target, source: 'world', verb: target.kind === 'station' ? 'DOCK' : 'INTERACT' };
        }
        dock(station) {
            station = ns.Galaxies.availableLandmarks(this.state).find(item => item.type === 'station' && item.id === station?.id);
            if (!station) { this.notify('DOCKING FAILED // NO VALID STATION'); return false; }
            station = ns.StationWar.effectiveStation(this.state, station);
            if (ns.Expansion.dockingDenied(this.state, station.faction)) { this.notify('DOCKING DENIED // HOSTILE STANDING'); return false; }
            this.cancelInteraction(true); if (!this.state.discoveries.includes(station.id)) this.state.discoveries.push(station.id);
            this.state.dockedAt = station.id; this.state.ship.vx = 0; this.state.ship.vy = 0; ns.Economy.ensureMarket(this.state, station);
            ns.Wallet.deposit(this.state);
            const c = this.state.contracts.active; if (c) ns.Contracts.recordProgress(this.state, 'dock', 1, station);
            if (c && ns.Contracts.isComplete(c)) { const completed = ns.Contracts.complete(this.state); if (completed) this.notify('CONTRACT COMPLETE // REWARDS BANKED'); }
            if (!this.state.contracts.active) ns.Contracts.ensureBoardForStation(this.state, station);
            ns.StationWar.clearBattle(this.state); ns.Economy.driftMarkets(this.state); this.save(); this.paused = true; this.ui.openPanel(this, 'station'); this.notify(`DOCKED // ${station.name.toUpperCase()}`); return true;
        }
        stargateTravel(destinationId) {
            if (this.stargateTransitioning) return false;
            const destination = ns.Galaxies.byId(destinationId), cooldown = Math.max(0, ns.Galaxies.STARGATE_COOLDOWN_MS - (Date.now() - this.state.lastStargateTravelAt));
            const blocked = !this.state.dockedAt ? 'DOCK AT A STATION' : !ns.Galaxies.gateStatus(this.state).ready ? 'STARGATE SYSTEMS OFFLINE' : destination.id === this.state.galaxyId ? 'ALREADY IN THIS GALAXY' : !ns.Galaxies.connected(this.state.galaxyId, destination.id) ? 'NO DIRECT STARGATE ROUTE' : this.state.contracts.active ? 'COMPLETE OR ABANDON ACTIVE CONTRACT' : cooldown > 0 ? `COOLDOWN ${Math.ceil(cooldown / 1000)} SEC` : '';
            if (blocked) { this.notify(`STARGATE TRAVEL BLOCKED // ${blocked}`); return false; }
            this.stargateTransitioning = true; this.ui.playStargateTransition(() => this.commitStargateTravel(destinationId), () => { this.stargateTransitioning = false; }); return true;
        }
        commitStargateTravel(destinationId) {
            const firstVisit = !this.state.visitedGalaxies.includes(destinationId);
            const outcome = ns.Galaxies.travel(this.state, destinationId);
            if (!outcome.ok) {
                const reason = { 'dock-required': 'DOCK AT A STATION', 'systems-offline': 'STARGATE SYSTEMS OFFLINE', 'unknown-galaxy': 'UNKNOWN GALAXY', 'current-galaxy': 'ALREADY IN THIS GALAXY', 'no-direct-route': 'NO DIRECT STARGATE ROUTE', 'active-contract': 'COMPLETE OR ABANDON ACTIVE CONTRACT', cooldown: `COOLDOWN ${Math.ceil((outcome.remaining || 0) / 1000)} SEC` }[outcome.reason] || outcome.reason.toUpperCase();
                this.notify(`STARGATE TRAVEL BLOCKED // ${reason}`); return false;
            }
            this.useState(this.state); this.paused = true; this.save();
            const takeover = ns.StationWar.runTravelTick(this.state, outcome.destination.id);
            if (takeover) this.useState(this.state);
            this.ui.navigationView = 'stargate'; this.ui.selectedGalaxyId = outcome.destination.id; this.ui.openPanel(this, 'navigation');
            const unlockedFaction = firstVisit && outcome.destination.unlocksFaction ? ns.Data.FACTIONS[outcome.destination.unlocksFaction] : null;
            this.save();
            if (takeover) this.notify(`STATION TAKEOVER // ${takeover.station.name.toUpperCase()} NOW ${ns.Data.FACTIONS[takeover.invader].short} CONTROLLED`);
            this.notify(unlockedFaction ? `STARGATE ARRIVAL // ${outcome.destination.name.toUpperCase()} // ${unlockedFaction.short} ENCLAVES NOW ACTIVE` : `STARGATE ARRIVAL // GALAXY ${outcome.destination.code} // ${outcome.destination.name.toUpperCase()}`); return true;
        }
        undock() { this.state.dockedAt = null; const timerStarted = ns.Contracts.startTimer(this.state); this.paused = false; this.ui.closePanel(); this.last = performance.now(); this.notify(timerStarted ? 'FLIGHT CONTROL RESTORED // CONTRACT TIMER STARTED' : 'FLIGHT CONTROL RESTORED'); }
        selectTarget() { if (!this.enemies.length) return; this.enemies.push(this.enemies.shift()); }
        defeatSnapshot() {
            const s = this.state.ship, hull = ns.Progression.activeHull(this.state);
            return { x: s.x, y: s.y, vx: s.vx || 0, vy: s.vy || 0, angle: s.angle || 0, radius: ns.Progression.calculateShipStats(this.state).radius, activeHullId: s.activeHullId, slots: Object.assign({}, s.slots), hullShape: hull.shape.map(point => point.slice()) };
        }
        createDeathCinematic(snapshot, result) {
            const hullShape = snapshot.hullShape?.length ? snapshot.hullShape : ns.Geometry.SHAPES.cutter, count = Math.min(hullShape.length, snapshot.radius >= 18 ? 7 : 5), step = Math.max(1, Math.floor(hullShape.length / count));
            const fragments = Array.from({ length: count }, (_, index) => [[0, 0], hullShape[(index * step) % hullShape.length], hullShape[((index + 1) * step) % hullShape.length]]).map((fragment, index, all) => {
                const angle = snapshot.angle + index / Math.max(1, all.length) * Math.PI * 2, speed = 58 + this.random.range(0, 96);
                return { fragment, x: Math.cos(angle) * 5, y: Math.sin(angle) * 5, vx: snapshot.vx * .26 + Math.cos(angle) * speed, vy: snapshot.vy * .26 + Math.sin(angle) * speed, rotation: snapshot.angle + Math.PI / 2, spin: this.random.range(-3.2, 3.2), scale: ns.MathUtil.shipScale(snapshot) || 1, color: '#55f0ad' };
            });
            const sparks = Array.from({ length: 18 }, (_, index) => { const angle = index / 18 * Math.PI * 2 + this.random.range(-.12, .12), speed = this.random.range(70, 190); return { angle, speed, size: this.random.range(1, 2.6), color: index % 4 === 0 ? '#ffbd59' : index % 3 === 0 ? '#55d7ff' : '#d9edf2' }; });
            return { elapsed: 0, duration: 3, promptOpen: false, snapshot, result, fragments, sparks, flavor: this.ui.defeatFlavorLine(this.state, result) };
        }
        onDefeat() {
            if (this.deathCinematic) return this.deathCinematic.result;
            const snapshot = this.defeatSnapshot(); ns.StationWar.clearBattle(this.state); const result = ns.Combat.defeatConsequences(this.state, this.world);
            this.lightSpeed = ns.LightSpeed.createState(); this.camera.x = snapshot.x; this.camera.y = snapshot.y; this.camera.zoom = 1; this.effects = []; this.paused = true; this.impactShake = Math.max(this.impactShake, 1.8); this.deathCinematic = this.createDeathCinematic(snapshot, result); this.save();
            this.defeatPromptTimer = setTimeout(() => { if (!this.deathCinematic) return; this.deathCinematic.promptOpen = true; this.defeatPromptTimer = 0; this.ui.openDefeat(this, result, this.deathCinematic.flavor); }, 3000);
            return result;
        }
        save(message) { ns.Objectives?.evaluate(this.state, this.state.galaxyId); ns.Save.save(this.state); if (message) this.notify(message); }
        notify(message) { this.ui.showMessage(message); this.messageTimer = 3; }
        destroy() { this.running = false; if (this.defeatPromptTimer) clearTimeout(this.defeatPromptTimer); this.runtime.destroy(this); this.input.destroy(); this.ui.destroy?.(); window.removeEventListener('resize', this.onResize); }
    }
    ns.Game = Game;
})(window.FrontierWayfarer);
