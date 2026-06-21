(function (ns) {
    const { clamp, distance, circlesOverlap } = ns.MathUtil;
    const { LANDMARKS, MODULES } = ns.Data;

    class Game {
        constructor(canvas, ui) {
            this.canvas = canvas; this.ui = ui; this.input = new ns.Input(window); this.renderer = new ns.Renderer(canvas);
            this.state = null; this.world = null; this.region = ns.Data.REGIONS[0]; this.camera = { x: 0, y: 0, zoom: 1 }; this.lightSpeed = ns.LightSpeed.createState();
            this.bullets = []; this.enemies = []; this.effects = []; this.time = 0; this.running = false; this.paused = false; this.last = 0; this.accumulator = 0;
            this.weaponCooldowns = { primary1: 0, primary2: 0 }; this.enemySpawnedFor = null; this.autosaveTimer = 0; this.uiTimer = 0; this.messageTimer = 0; this.encounterTimer = 18; this.collisionGuards = new Map(); this.impactShake = 0;
            this.interactionCast = null;
            this.loop = this.loop.bind(this); this.onResize = () => this.renderer.resize(); window.addEventListener('resize', this.onResize);
        }
        newCareer() { ns.Save.remove(); this.useState(ns.State.createState()); this.ui.hideStart(); this.running = true; this.paused = false; this.last = performance.now(); requestAnimationFrame(this.loop); if (this.state.dockedAt) this.ui.openPanel(this, 'station'); this.notify('WAYFARER ONLINE // FREE PILOT LICENSE ISSUED'); }
        continueCareer() { const state = ns.Save.load(); if (!state) return this.newCareer(); this.useState(state); this.ui.hideStart(); this.running = true; this.paused = false; this.last = performance.now(); requestAnimationFrame(this.loop); if (this.state.dockedAt) this.ui.openPanel(this, 'station'); this.notify('CAREER RESTORED'); }
        useState(state) {
            if (!('customWaypoint' in state)) state.customWaypoint = null;
            this.state = state; this.world = new ns.World.WorldService(state.worldSeed, state.consumedEntityIds); this.region = this.world.update(state.ship.x, state.ship.y);
            this.camera.x = state.ship.x; this.camera.y = state.ship.y; this.camera.zoom = 1; this.lightSpeed = ns.LightSpeed.createState(); this.bullets = []; this.enemies = []; this.effects = []; this.collisionGuards.clear(); this.impactShake = 0; this.interactionCast = null;
            const stats = ns.Progression.calculateShipStats(state); state.ship.hull = clamp(state.ship.hull, 0, stats.hull); state.ship.shield = clamp(state.ship.shield, 0, stats.shield); state.ship.energy = clamp(state.ship.energy, 0, stats.reactor);
            if (state.dockedAt) { const station = LANDMARKS.find(l => l.id === state.dockedAt); if (station) ns.Economy.ensureMarket(state, station); }
            this.ui.renderAll(this);
        }
        loop(now) {
            if (!this.running) return;
            const elapsed = Math.min(.1, (now - this.last) / 1000 || 0); this.last = now; this.accumulator += elapsed;
            const interfaceHandled = this.processInterfaceInput();
            const step = 1 / 60; let stepped = false;
            while (this.accumulator >= step) { if (!this.paused) this.update(step); this.accumulator -= step; stepped = true; }
            this.renderer.render(this); this.ui.updateHud(this); if ((stepped && !this.paused) || interfaceHandled || (stepped && this.paused)) this.input.endFrame(); requestAnimationFrame(this.loop);
        }
        processInterfaceInput() {
            if (!this.state) return false;
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
                ns.LightSpeed.update(this, dt); this.region = ns.World.regionAt(this.state.ship.x, this.state.ship.y);
            } else {
                ns.LightSpeed.update(this, dt); ns.Abilities.update(this, dt); this.world.updateAsteroids(dt); this.updateShip(dt); this.updateInteraction(dt); this.updateBullets(dt); this.updateEnemies(dt); this.updateEffects(dt); this.updateContract(dt);
                this.region = this.world.update(this.state.ship.x, this.state.ship.y);
                this.chartNearbyStations();
            }
            if (previousRegion !== this.region.id) {
                if (!this.state.visitedRegions.includes(this.region.id)) this.state.visitedRegions.push(this.region.id);
                this.notify(`ENTERING ${this.region.name.toUpperCase()}`);
            }
            this.updateCustomWaypoint();
            this.camera.zoom = travel.zoom; this.camera.x += (this.state.ship.x - this.camera.x) * Math.min(1, dt * (ns.LightSpeed.isShifted(this) ? 12 : 5)); this.camera.y += (this.state.ship.y - this.camera.y) * Math.min(1, dt * (ns.LightSpeed.isShifted(this) ? 12 : 5));
            if (this.autosaveTimer >= 120 && this.enemies.length === 0) { this.save('AUTOSAVE COMPLETE'); this.autosaveTimer = 0; }
            this.encounterTimer -= dt;
            if (travel.phase === 'idle' && this.encounterTimer <= 0 && this.enemies.length === 0 && !this.state.dockedAt && Math.random() < .18 + this.region.danger * .09) {
                const a = Math.random() * Math.PI * 2; this.spawnEnemies(Math.min(4, 1 + Math.ceil(this.region.danger / 2)), { x: this.state.ship.x + Math.cos(a) * 900, y: this.state.ship.y + Math.sin(a) * 900 });
                this.notify('UNSCHEDULED CONTACTS // WEAPONS HOT');
            }
            if (this.encounterTimer <= 0) this.encounterTimer = 24 + Math.random() * 18;
            if (this.uiTimer >= .2) { this.ui.renderContext(this); this.uiTimer = 0; }
        }
        setCustomWaypoint(point) {
            const bounds = ns.World.WORLD_BOUNDS;
            this.state.customWaypoint = { x: clamp(point.x, bounds.minX, bounds.maxX), y: clamp(point.y, bounds.minY, bounds.maxY) };
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
            const afterburner = ns.Abilities.isActive(this.state, 'afterburner');
            const force = stats.thrust * (afterburner ? 2.1 : 1) * overweight; s.vx += Math.cos(s.angle) * thrust * force * dt; s.vy += Math.sin(s.angle) * thrust * force * dt;
            const strafe = (this.input.down('d', 'ArrowRight') ? 1 : 0) - (this.input.down('a', 'ArrowLeft') ? 1 : 0);
            const strafeForce = force * .55 * (1 + (stats.effects.strafe || 0));
            s.vx += Math.cos(s.angle + Math.PI / 2) * strafe * strafeForce * dt; s.vy += Math.sin(s.angle + Math.PI / 2) * strafe * strafeForce * dt;
            const drag = Math.pow(.992, dt * 60); s.vx *= drag; s.vy *= drag; const speed = Math.hypot(s.vx, s.vy), maxSpeed = afterburner ? 620 : 340;
            if (speed > maxSpeed) { s.vx *= maxSpeed / speed; s.vy *= maxSpeed / speed; }
            s.x += s.vx * dt; s.y += s.vy * dt; this.state.stats.distance += speed * dt;
            const exposure = ns.World.boundaryExposure(s.x, s.y);
            if (exposure.active) {
                ns.Combat.applyHullDamage(this.state, Math.min(180, 32 + exposure.depth * .16) * dt);
                if (this.messageTimer <= 0) this.notify('NEBULA BREACH // HULL FAILURE IMMINENT');
            }
            s.energy = Math.min(stats.reactor, s.energy + stats.energyRecharge * dt); s.heat = Math.max(0, s.heat - stats.cooling * dt);
            s.shieldRechargeDelay = Math.max(0, (s.shieldRechargeDelay || 0) - dt);
            if (s.shieldRechargeDelay <= 0) s.shield = Math.min(stats.shield, s.shield + stats.shieldRecharge * dt);
            if (stats.effects.fieldRepair && this.enemies.length === 0) s.hull = Math.min(stats.hull, s.hull + stats.effects.fieldRepair * dt);
            Object.keys(this.weaponCooldowns).forEach(slot => { this.weaponCooldowns[slot] -= dt; });
            if (this.input.mouse.primary) this.fire('primary1');
            if (this.input.mouse.secondary) this.fire('primary2');
            if (this.input.consume('f')) this.interact();
            Object.entries(ns.Abilities.KEY_SLOTS).forEach(([key, slot]) => { if (this.input.consume(key)) ns.Abilities.activate(this, slot); });
            if (this.input.consume('Tab')) this.selectTarget();
            this.handleAsteroidCollisions(dt);
        }
        handleAsteroidCollisions(dt) {
            const s = this.state.ship;
            this.world.nearbyEntities(s.x, s.y, 90).filter(e => e.kind === 'asteroid').forEach(e => this.resolveShipAsteroidCollision(s, 17, e, 'player'));
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
                this.collisionGuards.set(key, this.time + .3); const shipDamage = (closingSpeed - 35) * .12;
                if (kind === 'player') ns.Combat.applyDamage(this.state, shipDamage); else { body.hull -= shipDamage; if (body.hull <= 0) this.onEnemyKilled(body); }
                const result = this.world.damageAsteroid(asteroid, shipDamage * .65); this.spawnImpact({ x: body.x - nx * radius, y: body.y - ny * radius, vx: asteroid.vx, vy: asteroid.vy }, result.destroyed ? 16 : 9); this.impactShake = Math.max(this.impactShake, Math.min(8, shipDamage * .15));
            }
            return true;
        }
        fire(slot) {
            const s = this.state.ship, stats = ns.Progression.calculateShipStats(this.state); const module = MODULES[s.slots[slot]];
            if (!module || this.weaponCooldowns[slot] > 0 || s.energy < module.energy || s.heat + module.heat > 100) return false;
            this.weaponCooldowns[slot] = module.fireRate; s.energy -= module.energy; s.heat += module.heat * (1 + (stats.effects.weaponHeat || 0)); ns.Abilities.onFire(this.state);
            const critical = Math.random() < (stats.effects.critical || 0), muzzle = this.weaponMuzzle(slot, module); this.bullets.push({ x: muzzle.x, y: muzzle.y, vx: s.vx + Math.cos(s.angle) * 720, vy: s.vy + Math.sin(s.angle) * 720, radius: slot === 'primary2' ? 5 : 3, damage: module.damage * (critical ? 2 + (stats.effects.criticalPower || 0) : 1), life: slot === 'primary2' ? 2.2 : 1.5, enemy: false }); return true;
        }
        weaponMuzzle(slot, module) {
            return ns.MathUtil.weaponHardpoint(this.state.ship, slot, module);
        }
        updateBullets(dt) {
            for (const b of this.bullets) {
                const from = { x: b.x, y: b.y }, to = { x: b.x + b.vx * dt, y: b.y + b.vy * dt }; b.life -= dt;
                const candidates = this.world.loadedEntities().filter(entity => entity.kind === 'asteroid').map(target => ({ kind: 'asteroid', target, t: ns.MathUtil.segmentCircleHit(from, to, target, b.radius) })).filter(hit => hit.t !== null);
                if (b.enemy) {
                    const player = { x: this.state.ship.x, y: this.state.ship.y, radius: 14 };
                    candidates.push({ kind: 'player', target: player, t: ns.MathUtil.segmentCircleHit(from, to, player, b.radius) });
                    const convoy = this.state.contracts.active?.escort?.convoy; if (convoy?.hull > 0) candidates.push({ kind: 'convoy', target: convoy, t: ns.MathUtil.segmentCircleHit(from, to, convoy, b.radius) });
                } else this.enemies.filter(enemy => enemy.hull > 0).forEach(target => candidates.push({ kind: 'enemy', target, t: ns.MathUtil.segmentCircleHit(from, to, target, b.radius) }));
                const hit = candidates.filter(item => item.t !== null).sort((a, b2) => a.t - b2.t)[0];
                if (!hit) { b.x = to.x; b.y = to.y; continue; }
                b.x = from.x + (to.x - from.x) * hit.t; b.y = from.y + (to.y - from.y) * hit.t; b.life = 0;
                if (hit.kind === 'asteroid') { const result = this.world.damageAsteroid(hit.target, b.damage); this.spawnImpact(hit.target, result.destroyed ? 10 : 4); if (!b.enemy && result.reward) ns.Wallet.credit(this.state, { aetherium: result.reward }); }
                else if (hit.kind === 'player') { if (ns.Combat.applyDamage(this.state, b.damage)) this.onDefeat(); }
                else if (hit.kind === 'convoy') hit.target.hull = Math.max(0, hit.target.hull - b.damage);
                else { hit.target.aggroed = true; hit.target.hull -= b.damage; if (hit.target.hull <= 0) this.onEnemyKilled(hit.target); }
            }
            this.bullets = this.bullets.filter(b => b.life > 0);
        }
        spawnImpact(source, count) {
            this.effects.push({ x: source.x, y: source.y, vx: 0, vy: 0, life: .16, maxLife: .16, size: 16 + count, flash: true });
            for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2, speed = 25 + Math.random() * 85; this.effects.push({ x: source.x, y: source.y, vx: source.vx * .25 + Math.cos(angle) * speed, vy: source.vy * .25 + Math.sin(angle) * speed, life: .25 + Math.random() * .45, maxLife: .7, size: 1 + Math.random() * 3 }); }
        }
        updateEffects(dt) { this.effects.forEach(effect => { effect.x += effect.vx * dt; effect.y += effect.vy * dt; effect.life -= dt; }); this.effects = this.effects.filter(effect => effect.life > 0); this.impactShake = Math.max(0, this.impactShake - dt * 24); }
        spawnEnemies(count, center, faction, role) {
            const formation = role === 'escort', formationAngle = formation ? Math.atan2(this.state.ship.y - center.y, this.state.ship.x - center.x) + Math.PI : 0;
            const direction = { x: Math.cos(formationAngle), y: Math.sin(formationAngle) }, lateral = { x: -direction.y, y: direction.x }, spawnDistance = ns.Contracts.ESCORT_CONFIG.enemySpawnDistance;
            for (let i = 0; i < count; i++) {
                const angle = i / count * Math.PI * 2, row = Math.ceil(i / 2), side = i === 0 ? 0 : i % 2 ? -1 : 1;
                const x = formation ? center.x + direction.x * (spawnDistance + row * 45) + lateral.x * side * row * 55 : center.x + Math.cos(angle) * (280 + i * 35);
                const y = formation ? center.y + direction.y * (spawnDistance + row * 45) + lateral.y * side * row * 55 : center.y + Math.sin(angle) * (280 + i * 35);
                this.enemies.push({ id: `hostile:${Date.now()}:${i}`, x, y, vx: 0, vy: 0, angle: formation ? formationAngle + Math.PI : angle + Math.PI, radius: 14, hull: 55 + this.region.danger * 12, maxHull: 55 + this.region.danger * 12, cooldown: .5 + Math.random(), faction: faction || (this.state.pilot.allegiance === 'corsairs' ? 'concord' : 'corsairs'), role: role || 'hostile', formation: formation ? 'wedge' : null, aggroed: false });
            }
        }
        updateEnemies(dt) {
            const s = this.state.ship;
            this.enemies.forEach(e => {
                if (e.hull <= 0 || e.disabled > 0) return; const convoy = this.state.contracts.active?.escort?.convoy, target = e.role === 'escort' && convoy?.hull > 0 && !e.aggroed ? convoy : s; const a = Math.atan2(target.y - e.y, target.x - e.x); e.angle = a; const d = distance(e, target); const accel = d > 250 ? 90 : -35;
                e.vx = (e.vx + Math.cos(a) * accel * dt) * Math.pow(.985, dt * 60); e.vy = (e.vy + Math.sin(a) * accel * dt) * Math.pow(.985, dt * 60); e.x += e.vx * dt; e.y += e.vy * dt; e.cooldown -= dt;
                if (!ns.Abilities.isActive(this.state, 'cloak') && d < 620 && e.cooldown <= 0) { e.cooldown = 1.15 + Math.random() * .7; this.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, radius: 3, damage: 11 + this.region.danger * 2, life: 2, enemy: true }); }
                this.world.nearbyEntities(e.x, e.y, 90).filter(entity => entity.kind === 'asteroid').forEach(asteroid => this.resolveShipAsteroidCollision(e, e.radius, asteroid, 'enemy'));
            });
            this.enemies = this.enemies.filter(e => e.hull > 0 && distance(e, s) < 2600);
        }
        onEnemyKilled(enemy) { if (enemy?.rewarded) return; if (enemy) enemy.rewarded = true; this.state.stats.kills++; ns.State.addExperience(this.state, 16 + this.region.danger * 4); ns.Contracts.recordProgress(this.state, 'kill', 1, enemy); ns.Progression.updateAchievements(this.state); ns.Wallet.credit(this.state, { aetherium: 8 + this.region.danger * 3, helionite: this.region.danger >= 3 ? 1 : 0 }); }
        updateContract(dt) {
            const c = this.state.contracts.active; if (!c) { this.enemySpawnedFor = null; return; }
            const revealed = ns.Contracts.revealSearches(this.state, this.state.ship);
            if (revealed.length) this.notify('SEARCH CONTACT RESOLVED // EXACT WAYPOINT LOCKED');
            const near = distance(this.state.ship, c.target) < 720, combatStage = ns.Contracts.activeStages(c).find(stage => stage.event === 'kill'), combatCount = combatStage?.required || c.required;
            if (['bounty', 'assault'].includes(c.type) && this.enemySpawnedFor === c.id && this.enemies.length === 0 && c.progress < c.required) this.enemySpawnedFor = null;
            if (near && ['bounty', 'assault'].includes(c.type) && this.enemySpawnedFor !== c.id) { this.spawnEnemies(combatCount, c.target); this.enemySpawnedFor = c.id; }
            if (c.escort) {
                const config = ns.Contracts.ESCORT_CONFIG, escort = c.escort;
                if (escort.phase === 'rendezvous' && distance(this.state.ship, escort.start) <= config.activationRange) {
                    const convoy = ns.Contracts.startEscort(this.state); this.spawnEnemies(2 + c.risk, convoy, null, 'escort'); escort.ambushes = 1; this.notify('CONVOY LINKED // ESCORT FORMATION ACTIVE');
                }
                if (escort.phase === 'traveling') {
                    const convoy = escort.convoy;
                    if (!convoy || convoy.hull <= 0) return this.failEscort('CONVOY DESTROYED');
                    const routeAngle = Math.atan2(escort.end.y - convoy.y, escort.end.x - convoy.x), remaining = distance(convoy, escort.end), step = Math.min(remaining, config.speed * dt);
                    convoy.vx = Math.cos(routeAngle) * config.speed; convoy.vy = Math.sin(routeAngle) * config.speed; convoy.angle = routeAngle; convoy.x += Math.cos(routeAngle) * step; convoy.y += Math.sin(routeAngle) * step; c.target = { x: convoy.x, y: convoy.y }; const escortStage = ns.Contracts.activeStages(c).find(stage => stage.escort); if (escortStage) escortStage.target = { x: convoy.x, y: convoy.y };
                    escort.grace = distance(this.state.ship, convoy) <= config.escortRange ? config.graceSeconds : escort.grace - dt;
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
            if (source === 'world') return target.kind === 'salvage' ? 3 : 5;
            return ['pickup', 'rescue', 'salvage'].includes(target.event) ? 4 : 5;
        }
        startInteraction(target, source) {
            if (!target) return false;
            if (this.interactionCast?.id === target.id) return true;
            const duration = this.interactionDuration(target, source);
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
            if (distance(target, this.state.ship) <= 190) { cast.grace = 0; cast.progress += dt; }
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
            if (['signal', 'salvage'].includes(target.kind) && !this.world.consumeEntity(this.state, target)) return false;
            const fresh = this.world.discover(this.state, target);
            if (target.kind === 'salvage') { const gain = Math.round(35 * (1 + (ns.Progression.traitEffects(this.state).salvage || 0))); ns.Wallet.credit(this.state, { aetherium: gain, sunshards: 1 }); this.notify(`SALVAGE RECOVERED // +${gain} AETHERIUM`); }
            else if (fresh) { const gain = Math.round(8 * (1 + (ns.Progression.traitEffects(this.state).discoveryReward || 0))); ns.Wallet.credit(this.state, { aetherium: 40, sunshards: gain }); ns.State.addExperience(this.state, 45); this.notify(`DISCOVERY LOGGED // +${gain} SUNSHARDS`); }
            ns.Progression.updateAchievements(this.state); this.save(); this.ui.renderAll(this); return true;
        }
        chartNearbyStations() {
            const sensor = ns.Progression.calculateShipStats(this.state).sensor;
            const discovered = LANDMARKS.filter(item => item.type === 'station' && !this.state.discoveries.includes(item.id) && distance(item, this.state.ship) <= sensor);
            if (!discovered.length) return;
            discovered.forEach(item => this.state.discoveries.push(item.id)); this.save();
            this.notify(`STATION CHARTED // ${discovered[0].name.toUpperCase()}`);
        }
        interact() {
            const s = this.state.ship, contact = ns.Contracts.contactsFor(this.state.contracts.active).filter(item => distance(item, s) <= 190).sort((a, b) => distance(a, s) - distance(b, s))[0];
            if (contact && distance(contact, s) <= 190) return this.startInteraction(contact, 'contract');
            const nearby = this.world.nearbyEntities(s.x, s.y, 190).sort((a, b) => distance(a, s) - distance(b, s))[0];
            if (!nearby) { this.notify('NO INTERACTION IN RANGE'); return; }
            if (nearby.kind === 'station') return this.dock(nearby);
            if (['signal', 'salvage', 'anomaly'].includes(nearby.kind)) return this.startInteraction(nearby, 'world');
        }
        dock(station) {
            const rep = this.state.reputations[station.faction]; if (rep <= -50) { this.notify('DOCKING DENIED // HOSTILE STANDING'); return false; }
            this.cancelInteraction(true); if (!this.state.discoveries.includes(station.id)) this.state.discoveries.push(station.id);
            this.state.dockedAt = station.id; this.state.ship.vx = 0; this.state.ship.vy = 0; ns.Economy.ensureMarket(this.state, station);
            ns.Wallet.deposit(this.state);
            const c = this.state.contracts.active; if (c) ns.Contracts.recordProgress(this.state, 'dock', 1, station);
            if (c && ns.Contracts.isComplete(c)) { const completed = ns.Contracts.complete(this.state); if (completed) this.notify('CONTRACT COMPLETE // REWARDS BANKED'); }
            ns.Economy.driftMarkets(this.state); this.save(); this.paused = true; this.ui.openPanel(this, 'station'); this.notify(`DOCKED // ${station.name.toUpperCase()}`); return true;
        }
        undock() { this.state.dockedAt = null; this.paused = false; this.ui.closePanel(); this.last = performance.now(); this.notify('FLIGHT CONTROL RESTORED'); }
        selectTarget() { if (!this.enemies.length) return; this.enemies.push(this.enemies.shift()); }
        onDefeat() { const result = ns.Combat.defeatConsequences(this.state, this.world); this.lightSpeed = ns.LightSpeed.createState(); this.camera.zoom = 1; this.enemies = []; this.bullets = []; this.paused = true; this.save(); this.ui.openDefeat(this, result); }
        save(message) { ns.Save.save(this.state); if (message) this.notify(message); }
        notify(message) { this.ui.showMessage(message); this.messageTimer = 3; }
        destroy() { this.running = false; this.input.destroy(); window.removeEventListener('resize', this.onResize); }
    }
    ns.Game = Game;
})(window.MiniInvadersV2);
