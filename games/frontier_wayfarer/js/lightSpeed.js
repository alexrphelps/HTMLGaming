(function (ns) {
    const CONFIG = {
        energyCost: 35, chargeDuration: 2.25, cruiseSpeed: 3200, turnRate: .55,
        decelerationDuration: 1.5, retryDelay: 3, cooldown: 6, boundaryLookahead: 3800, boundaryInset: 300
    };
    const shiftedPhases = ['cruising', 'decelerating'];
    function createState() {
        return { phase: 'idle', timer: 0, cooldown: 0, distance: 0, integrity: 0, damageSerial: 0, zoom: 1, forcedExit: false };
    }
    function ensure(game) { if (!game.lightSpeed) game.lightSpeed = createState(); return game.lightSpeed; }
    function fitted(game) { return game.state?.ship?.slots?.engine === 'light_drive'; }
    function isShifted(game) { return shiftedPhases.includes(ensure(game).phase); }
    function isTraveling(game) { return ensure(game).phase !== 'idle'; }
    function isLocked(game) { return ensure(game).phase !== 'idle' || ensure(game).cooldown > 0; }
    function integrity(ship) { return (ship.hull || 0) + (ship.shield || 0) + (ship.overshield || 0); }
    function canCharge(game) {
        const travel = ensure(game), panelOpen = Boolean(game.ui?.panel?.classList?.contains('active'));
        return Boolean(game.state && fitted(game) && !game.state.dockedAt && !panelOpen && travel.phase === 'idle' && travel.cooldown <= 0 && game.state.ship.energy >= CONFIG.energyCost);
    }
    function beginCharge(game) {
        if (!canCharge(game)) return false;
        game.cancelInteraction?.(true);
        const travel = ensure(game); travel.phase = 'charging'; travel.timer = 0; travel.distance = 0; travel.integrity = integrity(game.state.ship); travel.damageSerial = game.state.ship.damageSerial || 0; travel.zoom = 1; travel.forcedExit = false;
        game.notify('ASTERION DRIVE // PHASE CAST STARTED'); return true;
    }
    function beginDeceleration(game, forced) {
        const travel = ensure(game); if (travel.phase !== 'cruising') return false;
        travel.phase = 'decelerating'; travel.timer = 0; travel.forcedExit = Boolean(forced);
        game.notify(forced ? 'SECTOR EDGE // FORCED REMATERIALIZATION' : 'LIGHT SPEED // DECELERATING'); return true;
    }
    function toggle(game) {
        const phase = ensure(game).phase;
        if (phase === 'cruising') return beginDeceleration(game, false);
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
            ship.angle = approachAngle(ship.angle, target, CONFIG.turnRate * dt);
        }
        ship.vx = Math.cos(ship.angle) * speed; ship.vy = Math.sin(ship.angle) * speed;
        ship.x += ship.vx * dt; ship.y += ship.vy * dt;
        ensure(game).distance += speed * dt; game.state.stats.distance += speed * dt;
    }
    function distanceToBoundary(ship) {
        const b = ns.World.WORLD_BOUNDS, dx = Math.cos(ship.angle), dy = Math.sin(ship.angle), distances = [];
        if (dx > .0001) distances.push((b.maxX - ship.x) / dx); else if (dx < -.0001) distances.push((b.minX - ship.x) / dx);
        if (dy > .0001) distances.push((b.maxY - ship.y) / dy); else if (dy < -.0001) distances.push((b.minY - ship.y) / dy);
        return Math.min(...distances.filter(value => value >= 0));
    }
    function interrupt(game) {
        const travel = ensure(game); travel.phase = 'idle'; travel.timer = 0; travel.cooldown = CONFIG.retryDelay; travel.zoom = 1;
        game.notify('PHASE CAST INTERRUPTED // DRIVE RECALIBRATING');
    }
    function enter(game) {
        const travel = ensure(game), ship = game.state.ship;
        ship.energy -= CONFIG.energyCost; travel.phase = 'cruising'; travel.timer = 0; travel.zoom = .68;
        game.enemies = []; game.bullets = []; game.effects = [];
        move(game, CONFIG.cruiseSpeed, 0, false); game.notify('LIGHT SPEED // VECTOR CONTROL ONLINE');
    }
    function finish(game) {
        const travel = ensure(game), ship = game.state.ship, bounds = ns.World.WORLD_BOUNDS;
        ship.x = ns.MathUtil.clamp(ship.x, bounds.minX + CONFIG.boundaryInset, bounds.maxX - CONFIG.boundaryInset);
        ship.y = ns.MathUtil.clamp(ship.y, bounds.minY + CONFIG.boundaryInset, bounds.maxY - CONFIG.boundaryInset);
        ship.vx = Math.cos(ship.angle) * 340; ship.vy = Math.sin(ship.angle) * 340;
        travel.phase = 'idle'; travel.timer = 0; travel.cooldown = CONFIG.cooldown; travel.zoom = .55;
        game.region = game.world.update(ship.x, ship.y); game.camera.x = ship.x; game.camera.y = ship.y;
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
            travel.timer += dt; travel.zoom = 1 - .32 * Math.min(1, travel.timer / CONFIG.chargeDuration);
            const target = ns.MathUtil.angleToPointer(game.input.mouse, { w: game.renderer.w, h: game.renderer.h }, ship.angle);
            ship.angle = approachAngle(ship.angle, target, 1.1 * dt);
            move(game, 340 + 760 * Math.pow(Math.min(1, travel.timer / CONFIG.chargeDuration), 2), dt, false);
            if (travel.timer >= CONFIG.chargeDuration) enter(game);
            return;
        }
        if (travel.phase === 'cruising') {
            move(game, CONFIG.cruiseSpeed, dt, true); travel.zoom = .68;
            if (distanceToBoundary(ship) <= CONFIG.boundaryLookahead) beginDeceleration(game, true);
            return;
        }
        if (travel.phase === 'decelerating') {
            travel.timer += dt; const ratio = Math.min(1, travel.timer / CONFIG.decelerationDuration);
            move(game, CONFIG.cruiseSpeed + (340 - CONFIG.cruiseSpeed) * ratio * ratio, dt, true); travel.zoom = .68 - ratio * .13;
            if (ratio >= 1) finish(game);
        }
    }
    function status(game) {
        const travel = ensure(game), unlocked = game.state ? ns.Unlocks.evaluate(game.state).lightDrive : false;
        if (!unlocked && !game.state?.ship?.ownedModules?.includes('light_drive')) return { label: 'LICENSE LOCKED', className: 'locked' };
        if (!fitted(game)) return { label: game.state.ship.ownedModules.includes('light_drive') ? 'FIT DRIVE' : 'NOT INSTALLED', className: 'locked' };
        if (travel.phase === 'charging') return { label: `CHARGING ${Math.min(100, Math.round(travel.timer / CONFIG.chargeDuration * 100))}%`, className: 'charging' };
        if (travel.phase === 'cruising') return { label: 'R // DECELERATE', className: 'active' };
        if (travel.phase === 'decelerating') return { label: 'REMATERIALIZING', className: 'charging' };
        if (travel.cooldown > 0) return { label: `COOLDOWN ${travel.cooldown.toFixed(1)}S`, className: 'cooling' };
        if (game.state.ship.energy < CONFIG.energyCost) return { label: `NEED ${CONFIG.energyCost} ENERGY`, className: 'locked' };
        return { label: 'R // LIGHT SPEED', className: 'ready' };
    }
    ns.LightSpeed = { CONFIG, createState, ensure, fitted, isShifted, isTraveling, isLocked, canCharge, beginCharge, beginDeceleration, toggle, update, status, distanceToBoundary };
})(window.MiniInvadersV2);
