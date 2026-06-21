(function (ns) {
    const { clamp } = ns.MathUtil;
    function applyDamage(state, amount) {
        let remaining = Math.max(0, amount);
        if (remaining > 0) state.ship.damageSerial = (state.ship.damageSerial || 0) + 1;
        const overshieldHit = Math.min(state.ship.overshield || 0, remaining);
        state.ship.overshield = Math.max(0, (state.ship.overshield || 0) - overshieldHit); remaining -= overshieldHit;
        const shieldHit = Math.min(state.ship.shield, remaining);
        state.ship.shield -= shieldHit; remaining -= shieldHit;
        if (shieldHit > 0 || remaining > 0) state.ship.shieldRechargeDelay = ns.Progression.calculateShipStats(state).shieldDelay;
        state.ship.hull = Math.max(0, state.ship.hull - remaining);
        return state.ship.hull <= 0;
    }
    function applyHullDamage(state, amount) {
        const damage = Math.max(0, amount); if (damage > 0) state.ship.damageSerial = (state.ship.damageSerial || 0) + 1;
        state.ship.hull = Math.max(0, state.ship.hull - damage);
        return state.ship.hull <= 0;
    }
    function defeatConsequences(state, world) {
        const lostResources = ns.Wallet.loseUnbanked(state);
        const lostCargo = state.ship.insured ? {} : Object.assign({}, state.ship.cargo);
        if (!state.ship.insured) state.ship.cargo = {};
        Object.values(state.ship.slots).filter(Boolean).forEach((id, index) => {
            if ((index + state.contracts.completed) % 3 === 0) state.ship.moduleDamage[id] = clamp((state.ship.moduleDamage[id] || 0) + .18, 0, .75);
        });
        const station = world.nearestStation(state.ship.x, state.ship.y, l => state.reputations[l.faction] > -50) || ns.Data.LANDMARKS[0];
        state.ship.x = station.x + 180; state.ship.y = station.y; state.ship.vx = 0; state.ship.vy = 0;
        state.dockedAt = station.id;
        const stats = ns.Progression.calculateShipStats(state);
        state.ship.hull = Math.max(45, stats.hull * .45); state.ship.shield = stats.shield; state.ship.overshield = 0; state.ship.energy = stats.reactor; state.ship.heat = 0;
        state.contracts.active = null;
        return { station, lostResources, lostCargo };
    }
    function repairAll(state) {
        const stats = ns.Progression.calculateShipStats(state);
        const damage = Object.values(state.ship.moduleDamage).reduce((sum, d) => sum + d, 0);
        const missingHull = Math.max(0, stats.hull - state.ship.hull);
        const cost = { aetherium: Math.ceil(missingHull * 1.4 + damage * 420), sunshards: 0, helionite: 0 };
        if (cost.aetherium <= 0 || !ns.Wallet.debit(state, cost)) return false;
        state.stats.repairs += Math.round(missingHull + damage * 100);
        state.ship.moduleDamage = {}; state.ship.hull = stats.hull; state.ship.shield = stats.shield;
        ns.Progression.updateAchievements(state); return true;
    }
    ns.Combat = { applyDamage, applyHullDamage, defeatConsequences, repairAll };
})(window.MiniInvadersV2);
