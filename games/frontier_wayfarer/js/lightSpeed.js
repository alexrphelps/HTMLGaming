(function (ns) {
    const CONFIG = {
        activationCost: { sunshards: 5, helionite: 5 }, energyPerSecond: 5, heatPerSecond: 5, chargeDuration: 2.25, cruiseSpeed: 3200, turnRate: .55,
        decelerationDuration: 1.5, retryDelay: 3, cooldown: 6, boundaryLookahead: 3800, boundaryInset: 300
    };
    const shiftedPhases = ['cruising', 'decelerating'];
    function createState() {
        return { phase: 'idle', timer: 0, cooldown: 0, distance: 0, integrity: 0, damageSerial: 0, zoom: 1, forcedExit: false };
    }
    function ensure(game) { if (!game.lightSpeed) game.lightSpeed = createState(); return game.lightSpeed; }
    function drive(game) { return ns.Data.MODULES[game.state?.ship?.slots?.engine] || {}; }
    function reactor(game) { return ns.Data.MODULES[game.state?.ship?.slots?.reactor] || {}; }
    function fitted(game) { return Boolean(game.state && ns.Progression.calculateShipStats(game.state).lightSpeed); }
    function chargeDuration(game) { return CONFIG.chargeDuration * (drive(game).lightCharge || 1); }
    function decelerationDuration(game) { return CONFIG.decelerationDuration * (drive(game).lightDeceleration || 1); }
    function isShifted(game) { return shiftedPhases.includes(ensure(game).phase); }
    function isTraveling(game) { return ensure(game).phase !== 'idle'; }
    function isLocked(game) { return ensure(game).phase !== 'idle' || ensure(game).cooldown > 0; }
    function integrity(ship) { return (ship.hull || 0) + (ship.shield || 0) + (ship.overshield || 0); }
    function canCharge(game) {
        const travel = ensure(game), panelOpen = Boolean(game.ui?.panel?.classList?.contains('active'));
        return Boolean(game.state && fitted(game) && !game.state.dockedAt && !panelOpen && travel.phase === 'idle' && travel.cooldown <= 0 && game.state.ship.energy > 0 && game.state.ship.heat < 100 && ns.Wallet.canAffordCombined(game.state, CONFIG.activationCost));
    }
    function beginCharge(game) {
        if (!canCharge(game)) return false;
        game.cancelInteraction?.(true);
        const travel = ensure(game); travel.phase = 'charging'; travel.timer = 0; travel.distance = 0; travel.integrity = integrity(game.state.ship); travel.damageSerial = game.state.ship.damageSerial || 0; travel.zoom = 1; travel.forcedExit = false;
        game.notify('ASTERION DRIVE // PHASE CAST STARTED'); return true;
    }
    function beginDeceleration(game, forced, message) {
        const travel = ensure(game); if (travel.phase !== 'cruising') return false;
        travel.phase = 'decelerating'; travel.timer = 0; travel.forcedExit = Boolean(forced);
        game.notify(message || (forced ? 'SECTOR EDGE // FORCED REMATERIALIZATION' : 'LIGHT SPEED // DECELERATING')); return true;
    }
    function toggle(game) {
        const phase = ensure(game).phase;
        if (phase === 'cruising') return beginDeceleration(game, false);
        if (phase === 'charging') { interrupt(game, 'PHASE CAST CANCELLED // DRIVE RECALIBRATING'); return true; }
        if (phase === 'idle') return beginCharge(game);
        return false;
    }
    function approachAngle(current, target, amount) {
        let delta = (target - current + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        delta = Math.max(-amount, Math.min(amount, delta)); return current + delta;
    }
    function move(game, speed, dt, steer) {
        const ship = game.state.ship;
        if (steer) {
            const target = ns.MathUtil.angleToPointer(game.input.mouse, { w: game.renderer.w, h: game.renderer.h }, ship.angle);
            ship.angle = approachAngle(ship.angle, target, CONFIG.turnRate * (drive(game).lightTurn || 1) * dt);
        }
        ship.vx = Math.cos(ship.angle) * speed; ship.vy = Math.sin(ship.angle) * speed;
        ship.x += ship.vx * dt; ship.y += ship.vy * dt;
        ensure(game).distance += speed * dt; game.state.stats.distance += speed * dt;
    }
    function distanceToBoundary(ship, game) {
        const b = game?.world?.config?.bounds || ns.World.WORLD_BOUNDS, dx = Math.cos(ship.angle), dy = Math.sin(ship.angle), distances = [];
        if (dx > .0001) distances.push((b.maxX - ship.x) / dx); else if (dx < -.0001) distances.push((b.minX - ship.x) / dx);
        if (dy > .0001) distances.push((b.maxY - ship.y) / dy); else if (dy < -.0001) distances.push((b.minY - ship.y) / dy);
        const rectangular = Math.min(...distances.filter(value => value >= 0)), config = game?.world?.config;
        if (!config?.regions) return rectangular;
        return Math.min(rectangular, ns.World.distanceToInvalidSectorBoundary(ship, ship.angle, config, Math.min(rectangular, CONFIG.boundaryLookahead + 900)));
    }
    function interrupt(game, message) {
        const travel = ensure(game); travel.phase = 'idle'; travel.timer = 0; travel.cooldown = CONFIG.retryDelay; travel.zoom = 1;
        game.notify(message || 'PHASE CAST INTERRUPTED // DRIVE RECALIBRATING');
    }
    function enter(game) {
        const travel = ensure(game), ship = game.state.ship;
        if (!ns.Wallet.debitCombined(game.state, CONFIG.activationCost)) return interrupt(game, 'ASTERION DRIVE // ACTIVATION RESOURCES LOST');
        game.save?.();
        travel.phase = 'cruising'; travel.timer = 0; travel.zoom = .68;
        game.enemies = []; game.bullets = []; game.effects = [];
        move(game, CONFIG.cruiseSpeed, 0, false); game.notify('LIGHT SPEED // VECTOR CONTROL ONLINE');
    }
    function finish(game) {
        const travel = ensure(game), ship = game.state.ship, bounds = game.world?.config?.bounds || ns.World.WORLD_BOUNDS;
        ship.x = ns.MathUtil.clamp(ship.x, bounds.minX + CONFIG.boundaryInset, bounds.maxX - CONFIG.boundaryInset);
        ship.y = ns.MathUtil.clamp(ship.y, bounds.minY + CONFIG.boundaryInset, bounds.maxY - CONFIG.boundaryInset);
        const safe = ns.World.projectToValidPoint(ship.x, ship.y, game.world?.config, CONFIG.boundaryInset);
        ship.x = safe.x; ship.y = safe.y;
        ship.vx = Math.cos(ship.angle) * 340; ship.vy = Math.sin(ship.angle) * 340;
        travel.phase = 'idle'; travel.timer = 0; travel.cooldown = CONFIG.cooldown; travel.zoom = .55;
        game.region = game.world.update(ship.x, ship.y); game.camera.x = ship.x; game.camera.y = ship.y;
        if (ns.Progression.traitEffects(game.state).ghostVector) { ship.abilityEffects.cloak = 3; ship.abilityEffects.ghostVector = 5; }
        game.notify(`REMATERIALIZED // ${game.region.name.toUpperCase()}`);
    }
    function update(game, dt) {
        const travel = ensure(game), ship = game.state.ship;
        travel.cooldown = Math.max(0, travel.cooldown - dt);
        if (travel.phase === 'idle') {
            if (travel.zoom < 1) { const elapsed = CONFIG.cooldown - travel.cooldown; travel.zoom = elapsed < .35 ? .55 + elapsed / .35 * .53 : Math.max(1, 1.08 - (elapsed - .35) * .2); }
            else travel.zoom = 1;
            return;
        }
        if (travel.phase === 'charging') {
            if ((ship.damageSerial || 0) !== travel.damageSerial || integrity(ship) < travel.integrity - .001) return interrupt(game);
            const duration = chargeDuration(game); travel.timer += dt; travel.zoom = 1 - .32 * Math.min(1, travel.timer / duration);
            const target = ns.MathUtil.angleToPointer(game.input.mouse, { w: game.renderer.w, h: game.renderer.h }, ship.angle);
            ship.angle = approachAngle(ship.angle, target, 1.1 * dt);
            move(game, 340 + 760 * Math.pow(Math.min(1, travel.timer / duration), 2), dt, false);
            if (travel.timer >= duration) enter(game);
            return;
        }
        if (travel.phase === 'cruising') {
            ship.energy = Math.max(0, ship.energy - CONFIG.energyPerSecond * dt); ship.heat = Math.min(100, ship.heat + CONFIG.heatPerSecond * ns.Abilities.heatScale(game.state) * dt);
            move(game, CONFIG.cruiseSpeed, dt, true); travel.zoom = .68;
            if (ship.energy <= 0 || ship.heat >= 100) beginDeceleration(game, true, 'DRIVE RESERVES EXHAUSTED // FORCED REMATERIALIZATION');
            else if (distanceToBoundary(ship, game) <= CONFIG.boundaryLookahead) beginDeceleration(game, true);
            return;
        }
        if (travel.phase === 'decelerating') {
            travel.timer += dt; const ratio = Math.min(1, travel.timer / decelerationDuration(game));
            move(game, CONFIG.cruiseSpeed + (340 - CONFIG.cruiseSpeed) * ratio * ratio, dt, true); travel.zoom = .68 - ratio * .13;
            if (ratio >= 1) finish(game);
        }
    }
    function status(game) {
        const travel = ensure(game), unlocked = game.state ? ns.Unlocks.evaluate(game.state).lightDrive : false;
        if (!unlocked && !game.state?.ship?.ownedModules?.includes('light_drive')) return { label: 'LICENSE LOCKED', className: 'locked' };
        if (!fitted(game)) {
            const engine = drive(game), core = reactor(game);
            if (engine.lightSpeed && !core.lightSpeedSupport) return { label: 'FIT T3 REACTOR', className: 'locked' };
            return { label: game.state.ship.ownedModules.includes('light_drive') ? 'FIT DRIVE' : 'NOT INSTALLED', className: 'locked' };
        }
        if (travel.phase === 'charging') return { label: `CHARGING ${Math.min(100, Math.round(travel.timer / chargeDuration(game) * 100))}%`, className: 'charging' };
        if (travel.phase === 'cruising') return { label: 'R // DECELERATE', className: 'active' };
        if (travel.phase === 'decelerating') return { label: 'REMATERIALIZING', className: 'charging' };
        if (travel.cooldown > 0) return { label: `COOLDOWN ${travel.cooldown.toFixed(1)}S`, className: 'cooling' };
        if (!ns.Wallet.canAffordCombined(game.state, CONFIG.activationCost)) return { label: 'NEED 5 SS + 5 HE', className: 'locked' };
        if (game.state.ship.energy <= 0 || game.state.ship.heat >= 100) return { label: 'DRIVE RESERVES EXHAUSTED', className: 'locked' };
        return { label: 'R // LIGHT SPEED', className: 'ready' };
    }
    ns.LightSpeed = { CONFIG, createState, ensure, fitted, drive, reactor, chargeDuration, decelerationDuration, isShifted, isTraveling, isLocked, canCharge, beginCharge, beginDeceleration, toggle, update, status, distanceToBoundary };
})(window.FrontierWayfarer);
