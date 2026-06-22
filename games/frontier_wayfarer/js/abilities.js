(function (ns) {
    const KEY_SLOTS = { ' ': 'abilitySpace', q: 'abilityQ', e: 'abilityE', Shift: 'abilityShift' };
    function effectState(state) { state.ship.abilityEffects = state.ship.abilityEffects || {}; return state.ship.abilityEffects; }
    function cooldowns(state) { state.ship.abilityCooldowns = state.ship.abilityCooldowns || {}; return state.ship.abilityCooldowns; }
    function safeBlinkDestination(game, distance) {
        const ship = game.state.ship;
        for (let offset = distance; offset >= 70; offset -= 35) {
            const candidate = { x: ship.x + Math.cos(ship.angle) * offset, y: ship.y + Math.sin(ship.angle) * offset };
            const blocked = game.world.nearbyEntities(candidate.x, candidate.y, 55).some(entity => entity.kind === 'asteroid');
            if (!blocked) return candidate;
        }
        return { x: ship.x, y: ship.y };
    }
    function activate(game, slot) {
        if (ns.LightSpeed?.isTraveling(game)) return false;
        const state = game.state, unlocked = ns.Unlocks.evaluate(state).abilitySlots;
        const moduleId = state.ship.slots[slot], module = ns.Data.MODULES[moduleId];
        if (!unlocked[slot] || !module?.ability) return false;
        const cd = cooldowns(state), stats = ns.Progression.calculateShipStats(state), energyCost = module.ability.energy * (1 + (stats.effects.abilityEnergyCost || 0));
        const overclock = stats.effects.overclock && (cd[slot] || 0) > 0 && (cd[slot] || 0) <= module.ability.cooldown * .5;
        if (((cd[slot] || 0) > 0 && !overclock) || state.ship.energy < energyCost) return false;
        const ability = module.ability, effects = effectState(state);
        if (ability.type === 'overshield' && stats.shield <= 0) return false;
        state.ship.energy -= energyCost; if (overclock) { state.ship.heat = Math.min(100, state.ship.heat + 35); ns.Combat.applyHullDamage(state, 5); }
        cd[slot] = ability.cooldown * (ability.type === 'afterburner' ? 1 - (stats.effects.afterburnerRecovery || 0) : 1);
        if (ability.type === 'afterburner') effects.afterburner = ability.duration;
        if (ability.type === 'blink') Object.assign(state.ship, safeBlinkDestination(game, ability.distance));
        if (ability.type === 'overshield') { state.ship.overshield = ability.amount; effects.overshield = ability.duration; }
        if (ability.type === 'emp') {
            game.enemies.forEach(enemy => {
                if (ns.MathUtil.distance(enemy, state.ship) > ability.radius) return;
                enemy.aggroed = true;
                enemy.hull -= ability.damage; enemy.disabled = Math.max(enemy.disabled || 0, ability.duration);
                if (enemy.hull <= 0) game.onEnemyKilled(enemy);
            });
        }
        if (ability.type === 'repair') { effects.repair = ability.duration; effects.repairRemaining = ability.amount; }
        if (ability.type === 'cloak') effects.cloak = ability.duration;
        game.notify(`${module.name.toUpperCase()} // ACTIVE`); return true;
    }
    function update(game, dt) {
        const state = game.state, cd = cooldowns(state), effects = effectState(state);
        Object.keys(cd).forEach(slot => { cd[slot] = Math.max(0, cd[slot] - dt); });
        ['afterburner', 'overshield', 'cloak', 'damageResistance', 'ghostVector'].forEach(name => { if (effects[name] > 0) effects[name] = Math.max(0, effects[name] - dt); });
        if (effects.overshield === 0) state.ship.overshield = 0;
        if (effects.repair > 0 && effects.repairRemaining > 0) {
            const stats = ns.Progression.calculateShipStats(state); const restored = Math.min(effects.repairRemaining, effects.repairRemaining / effects.repair * dt);
            state.ship.hull = Math.min(stats.hull, state.ship.hull + restored); effects.repairRemaining -= restored; effects.repair = Math.max(0, effects.repair - dt);
        }
        game.enemies.forEach(enemy => { enemy.disabled = Math.max(0, (enemy.disabled || 0) - dt); });
    }
    function onFire(state) { const effects = effectState(state); effects.cloak = 0; }
    function isActive(state, name) { return (effectState(state)[name] || 0) > 0; }
    function slotState(state, slot) {
        const module = ns.Data.MODULES[state.ship.slots[slot]]; return { slot, module, unlocked: Boolean(ns.Unlocks.evaluate(state).abilitySlots[slot]), cooldown: cooldowns(state)[slot] || 0 };
    }
    ns.Abilities = { KEY_SLOTS, activate, update, onFire, isActive, slotState, safeBlinkDestination };
})(window.MiniInvadersV2);
