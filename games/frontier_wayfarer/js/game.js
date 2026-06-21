(function (ns) {
    const { clamp, distance, circlesOverlap } = ns.MathUtil;
    const { LANDMARKS, MODULES } = ns.Data;

    class Game {
        constructor(canvas, ui) {
            this.canvas = canvas; this.ui = ui; this.input = new ns.Input(window); this.renderer = new ns.Renderer(canvas);
            this.state = null; this.world = null; this.region = ns.Data.REGIONS[0]; this.camera = { x: 0, y: 0, zoom: 1 }; this.lightSpeed = ns.LightSpeed.createState();
            this.bullets = []; this.enemies = []; this.effects = []; this.time = 0; this.running = false; this.paused = false; this.last = 0; this.accumulator = 0;
            this.weaponCooldowns = { primary1: 0, primary2: 0 }; this.enemySpawnedFor = null; this.autosaveTimer = 0; this.uiTimer = 0; this.messageTimer = 0; this.encounterTimer = 18;
            this.loop = this.loop.bind(this); this.onResize = () => this.renderer.resize(); window.addEventListener('resize', this.onResize);
        }
        newCareer() { ns.Save.remove(); this.useState(ns.State.createState()); this.ui.hideStart(); this.running = true; this.paused = false; this.last = performance.now(); requestAnimationFrame(this.loop); if (this.state.dockedAt) this.ui.openPanel(this, 'station'); this.notify('WAYFARER ONLINE // FREE PILOT LICENSE ISSUED'); }
        continueCareer() { const state = ns.Save.load(); if (!state) return this.newCareer(); this.useState(state); this.ui.hideStart(); this.running = true; this.paused = false; this.last = performance.now(); requestAnimationFrame(this.loop); if (this.state.dockedAt) this.ui.openPanel(this, 'station'); this.notify('CAREER RESTORED'); }
        useState(state) {
            this.state = state; this.world = new ns.World.WorldService(state.worldSeed); this.region = this.world.update(state.ship.x, state.ship.y);
            this.camera.x = state.ship.x; this.camera.y = state.ship.y; this.camera.zoom = 1; this.lightSpeed = ns.LightSpeed.createState(); this.bullets = []; this.enemies = []; this.effects = [];
            const stats = ns.Progression.calculateShipStats(state); state.ship.hull = clamp(state.ship.hull, 0, stats.hull); state.ship.shield = clamp(state.ship.shield, 0, stats.shield); state.ship.energy = clamp(state.ship.energy, 0, stats.reactor);
            if (state.dockedAt) { const station = LANDMARKS.find(l => l.id === state.dockedAt); if (station) ns.Economy.ensureMarket(state, station); }
            this.ui.renderAll(this);
        }
        loop(now) {
            if (!this.running) return;
            const elapsed = Math.min(.1, (now - this.last) / 1000 || 0); this.last = now; this.accumulator += elapsed;
            if (this.paused && this.input.consume('Escape') && this.state && !this.state.dockedAt) this.ui.closePanel();
            const step = 1 / 60;
            while (this.accumulator >= step) { if (!this.paused) this.update(step); this.accumulator -= step; }
            this.renderer.render(this); this.ui.updateHud(this); this.input.endFrame(); requestAnimationFrame(this.loop);
        }
        update(dt) {
            this.time += dt; this.state.playTime += dt; this.autosaveTimer += dt; this.uiTimer += dt; this.messageTimer -= dt;
            const travel = ns.LightSpeed.ensure(this);
            if (this.input.consume('r')) ns.LightSpeed.toggle(this);
            if (travel.phase === 'idle') {
                if (this.input.consume('Escape')) this.ui.togglePanel(this, 'pause');
                else if (this.input.consume('m')) this.ui.togglePanel(this, 'navigation');
                else if (this.input.consume('t')) this.ui.togglePanel(this, 'traits');
                else if (this.input.consume('c')) this.ui.togglePanel(this, 'contracts');
            }
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
                ns.LightSpeed.update(this, dt); ns.Abilities.update(this, dt); this.world.updateAsteroids(dt); this.updateShip(dt); this.updateBullets(dt); this.updateEnemies(dt); this.updateEffects(dt); this.updateContract(dt);
                this.region = this.world.update(this.state.ship.x, this.state.ship.y);
            }
            if (previousRegion !== this.region.id) {
                if (!this.state.visitedRegions.includes(this.region.id)) this.state.visitedRegions.push(this.region.id);
                this.notify(`ENTERING ${this.region.name.toUpperCase()}`);
            }
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
        updateShip(dt) {
            const s = this.state.ship, stats = ns.Progression.calculateShipStats(this.state); const overweight = stats.mass > stats.massLimit ? .5 : 1;
            s.angle = ns.MathUtil.angleToPointer(this.input.mouse, { w: this.renderer.w, h: this.renderer.h }, s.angle);
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
            s.energy = Math.min(stats.reactor, s.energy + 14 * dt); s.heat = Math.max(0, s.heat - stats.cooling * dt);
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
            this.world.nearbyEntities(s.x, s.y, 85).filter(e => e.kind === 'asteroid').forEach(e => { if (circlesOverlap({ x: s.x, y: s.y, radius: 17 }, e)) { ns.Combat.applyDamage(this.state, (12 + Math.hypot(e.vx - s.vx, e.vy - s.vy) * .05) * dt); s.vx -= (e.x - s.x) * .4 * dt; s.vy -= (e.y - s.y) * .4 * dt; } });
            if (s.hull <= 0) this.onDefeat();
        }
        fire(slot) {
            const s = this.state.ship, stats = ns.Progression.calculateShipStats(this.state); const module = MODULES[s.slots[slot]];
            if (!module || this.weaponCooldowns[slot] > 0 || s.energy < module.energy || s.heat + module.heat > 100) return false;
            this.weaponCooldowns[slot] = module.fireRate; s.energy -= module.energy; s.heat += module.heat * (1 + (stats.effects.weaponHeat || 0)); ns.Abilities.onFire(this.state);
            const critical = Math.random() < (stats.effects.critical || 0), muzzle = this.weaponMuzzle(slot, module); this.bullets.push({ x: muzzle.x, y: muzzle.y, vx: s.vx + Math.cos(s.angle) * 720, vy: s.vy + Math.sin(s.angle) * 720, radius: slot === 'primary2' ? 5 : 3, damage: module.damage * (critical ? 2 + (stats.effects.criticalPower || 0) : 1), life: slot === 'primary2' ? 2.2 : 1.5, enemy: false }); return true;
        }
        weaponMuzzle(slot, module) {
            const s = this.state.ship, side = slot === 'primary2' ? 1 : -1, scale = 1 + Math.min(4, s.chassis.level - 1) * .035;
            const forward = (module.id.includes('rail') ? 31 : module.id.includes('seeker') ? 13 : 24) * scale, lateral = side * 15 * scale;
            return { x: s.x + Math.cos(s.angle) * forward - Math.sin(s.angle) * lateral, y: s.y + Math.sin(s.angle) * forward + Math.cos(s.angle) * lateral };
        }
        updateBullets(dt) {
            this.bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; });
            for (const b of this.bullets) {
                if (b.enemy && circlesOverlap(b, { x: this.state.ship.x, y: this.state.ship.y, radius: 14 })) { b.life = 0; if (ns.Combat.applyDamage(this.state, b.damage)) this.onDefeat(); }
                if (!b.enemy) for (const e of this.enemies) if (e.hull > 0 && circlesOverlap(b, e)) { e.hull -= b.damage; b.life = 0; if (e.hull <= 0) this.onEnemyKilled(e); break; }
                if (!b.enemy && b.life > 0) {
                    const asteroid = this.world.nearbyEntities(b.x, b.y, 75).find(entity => entity.kind === 'asteroid' && circlesOverlap(b, entity));
                    if (asteroid) {
                        const result = this.world.damageAsteroid(asteroid, b.damage); b.life = 0; this.spawnImpact(asteroid, result.destroyed ? 10 : 4);
                        if (result.reward) ns.Wallet.credit(this.state, { aetherium: result.reward });
                    }
                }
            }
            this.bullets = this.bullets.filter(b => b.life > 0);
        }
        spawnImpact(source, count) {
            for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2, speed = 25 + Math.random() * 85; this.effects.push({ x: source.x, y: source.y, vx: source.vx * .25 + Math.cos(angle) * speed, vy: source.vy * .25 + Math.sin(angle) * speed, life: .25 + Math.random() * .45, maxLife: .7, size: 1 + Math.random() * 3 }); }
        }
        updateEffects(dt) { this.effects.forEach(effect => { effect.x += effect.vx * dt; effect.y += effect.vy * dt; effect.life -= dt; }); this.effects = this.effects.filter(effect => effect.life > 0); }
        spawnEnemies(count, center, faction) {
            for (let i = 0; i < count; i++) {
                const angle = i / count * Math.PI * 2; this.enemies.push({ id: `hostile:${Date.now()}:${i}`, x: center.x + Math.cos(angle) * (280 + i * 35), y: center.y + Math.sin(angle) * (280 + i * 35), vx: 0, vy: 0, angle: angle + Math.PI, radius: 14, hull: 55 + this.region.danger * 12, maxHull: 55 + this.region.danger * 12, cooldown: .5 + Math.random(), faction: faction || (this.state.pilot.allegiance === 'corsairs' ? 'concord' : 'corsairs') });
            }
        }
        updateEnemies(dt) {
            const s = this.state.ship;
            this.enemies.forEach(e => {
                if (e.hull <= 0 || e.disabled > 0) return; const a = Math.atan2(s.y - e.y, s.x - e.x); e.angle = a; const d = distance(e, s); const accel = d > 250 ? 90 : -35;
                e.vx = (e.vx + Math.cos(a) * accel * dt) * Math.pow(.985, dt * 60); e.vy = (e.vy + Math.sin(a) * accel * dt) * Math.pow(.985, dt * 60); e.x += e.vx * dt; e.y += e.vy * dt; e.cooldown -= dt;
                if (!ns.Abilities.isActive(this.state, 'cloak') && d < 620 && e.cooldown <= 0) { e.cooldown = 1.15 + Math.random() * .7; this.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, radius: 3, damage: 11 + this.region.danger * 2, life: 2, enemy: true }); }
            });
            this.enemies = this.enemies.filter(e => e.hull > 0 && distance(e, s) < 2600);
        }
        onEnemyKilled() { this.state.stats.kills++; ns.State.addExperience(this.state, 16 + this.region.danger * 4); ns.Contracts.recordProgress(this.state, 'kill', 1); ns.Progression.updateAchievements(this.state); ns.Wallet.credit(this.state, { aetherium: 8 + this.region.danger * 3, helionite: this.region.danger >= 3 ? 1 : 0 }); }
        updateContract(dt) {
            const c = this.state.contracts.active; if (!c) { this.enemySpawnedFor = null; return; }
            const near = distance(this.state.ship, c.target) < 720;
            if (near && ['bounty', 'assault'].includes(c.type) && this.enemySpawnedFor !== c.id) { this.spawnEnemies(c.required, c.target); this.enemySpawnedFor = c.id; }
            if (near && c.type === 'escort') { c.escortTime = (c.escortTime || 0) + dt; if (c.escortTime >= 12) ns.Contracts.recordProgress(this.state, 'escort', c.required); }
            if (c.progress >= c.required) { const completed = ns.Contracts.complete(this.state); if (completed) { this.save(); this.notify('CONTRACT COMPLETE // REWARDS SECURED'); this.ui.renderAll(this); } }
        }
        interact() {
            const s = this.state.ship; const nearby = this.world.nearbyEntities(s.x, s.y, 190).sort((a, b) => distance(a, s) - distance(b, s))[0];
            if (!nearby) { this.notify('NO INTERACTION IN RANGE'); return; }
            if (nearby.kind === 'station') return this.dock(nearby);
            if (['signal', 'salvage', 'anomaly'].includes(nearby.kind)) {
                const fresh = this.world.discover(this.state, nearby); const c = this.state.contracts.active;
                if (nearby.kind === 'salvage') { const gain = Math.round(35 * (1 + (ns.Progression.traitEffects(this.state).salvage || 0))); ns.Wallet.credit(this.state, { aetherium: gain, sunshards: 1 }); ns.Contracts.recordProgress(this.state, 'salvage', 1); this.notify(`SALVAGE RECOVERED // +${gain} AETHERIUM`); }
                else { ns.Contracts.recordProgress(this.state, c && c.type === 'rescue' ? 'rescue' : 'scan', 1); if (fresh) { const gain = Math.round(8 * (1 + (ns.Progression.traitEffects(this.state).discoveryReward || 0))); ns.Wallet.credit(this.state, { aetherium: 40, sunshards: gain }); ns.State.addExperience(this.state, 45); this.notify(`DISCOVERY LOGGED // +${gain} SUNSHARDS`); } }
                ns.Progression.updateAchievements(this.state); this.ui.renderAll(this);
            }
        }
        dock(station) {
            const rep = this.state.reputations[station.faction]; if (rep <= -50) { this.notify('DOCKING DENIED // HOSTILE STANDING'); return false; }
            this.state.dockedAt = station.id; this.state.ship.vx = 0; this.state.ship.vy = 0; ns.Economy.ensureMarket(this.state, station);
            ns.Wallet.deposit(this.state);
            const c = this.state.contracts.active; if (c && c.destination === station.id) ns.Contracts.recordProgress(this.state, 'dock', c.required);
            if (c && c.progress >= c.required) { const completed = ns.Contracts.complete(this.state); if (completed) this.notify('CONTRACT COMPLETE // REWARDS BANKED'); }
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
