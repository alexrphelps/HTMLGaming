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
    const abilityHandlers = {
        afterburner: { activate({ effects, ability }) { effects.afterburner = ability.duration; effects.afterburnerThrustScale = ability.thrustScale || 2.1; effects.afterburnerSpeedScale = ability.speedScale || 1.82; } },
        blink: { activate({ game, ability }) { const ship = game.state.ship, from = { x: ship.x, y: ship.y }, to = safeBlinkDestination(game, ability.distance); Object.assign(ship, to); game.blinkEffect = { from, to: { x: to.x, y: to.y }, life: .35, maxLife: .35 }; } },
        overshield: { canActivate({ stats }) { return stats.shield > 0; }, activate({ state, effects, ability }) { state.ship.overshield = ability.amount; effects.overshield = ability.duration; } },
        emp: { activate({ game, state, ability }) { game.enemies.forEach(enemy => { if (ns.MathUtil.distance(enemy, state.ship) > ability.radius) return; enemy.aggroed = true; enemy.hull -= ability.damage; enemy.disabled = Math.max(enemy.disabled || 0, ability.duration); if (enemy.hull <= 0) game.onEnemyKilled(enemy); }); } },
        repair: { activate({ effects, ability }) { effects.repair = ability.duration; effects.repairRemaining = ability.amount; } },
        cloak: { activate({ effects, ability }) { effects.cloak = ability.duration; } },
        deepFreeze: { activate({ state, effects, ability }) { state.ship.heat = Math.max(0, state.ship.heat - ability.heatVent); effects.deepFreeze = ability.duration; effects.deepFreezeScale = ability.heatScale; } }
    };
    Object.entries(abilityHandlers).forEach(([id, handler]) => { if (!ns.Registry.hasHandler('ability', id)) ns.Registry.registerHandler('ability', id, handler); });
    function activate(game, slot) {
        if (ns.LightSpeed?.isTraveling(game)) return false;
        const state = game.state, unlocked = ns.Unlocks.evaluate(state).abilitySlots;
        const moduleId = state.ship.slots[slot], module = ns.Data.MODULES[moduleId];
        if (!unlocked[slot] || !module?.ability) return false;
        const cd = cooldowns(state), stats = ns.Progression.calculateShipStats(state), energyCost = module.ability.energy * (1 + (stats.effects.abilityEnergyCost || 0)), heatCost = (module.ability.heat || 0) * heatScale(state);
        const overclock = stats.effects.overclock && (cd[slot] || 0) > 0 && (cd[slot] || 0) <= module.ability.cooldown * .5;
        if (((cd[slot] || 0) > 0 && !overclock) || state.ship.energy < energyCost || state.ship.heat + heatCost > 100) return false;
        const ability = module.ability, effects = effectState(state);
        const handler = ns.Registry.handler('ability', ability.type); if (!handler || handler.canActivate?.({ game, state, stats, ability }) === false) return false;
        state.ship.energy -= energyCost; state.ship.heat += heatCost; if (overclock) { state.ship.heat = Math.min(100, state.ship.heat + 35 * heatScale(state)); ns.Combat.applyHullDamage(state, 5); }
        cd[slot] = ability.cooldown * (ability.type === 'afterburner' ? 1 - (stats.effects.afterburnerRecovery || 0) : 1);
        handler.activate({ game, state, stats, effects, ability, module, slot });
        game.notify(`${module.name.toUpperCase()} // ACTIVE`); return true;
    }
    function update(game, dt) {
        const state = game.state, cd = cooldowns(state), effects = effectState(state);
        Object.keys(cd).forEach(slot => { cd[slot] = Math.max(0, cd[slot] - dt); });
        ['afterburner', 'overshield', 'cloak', 'damageResistance', 'ghostVector', 'deepFreeze'].forEach(name => { if (effects[name] > 0) effects[name] = Math.max(0, effects[name] - dt); });
        if (effects.deepFreeze === 0) effects.deepFreezeScale = 1;
        if (effects.afterburner === 0) { effects.afterburnerThrustScale = 2.1; effects.afterburnerSpeedScale = 1.82; }
        if (effects.overshield === 0) state.ship.overshield = 0;
        if (effects.repair > 0 && effects.repairRemaining > 0) {
            const stats = ns.Progression.calculateShipStats(state); const restored = Math.min(effects.repairRemaining, effects.repairRemaining / effects.repair * dt);
            state.ship.hull = Math.min(stats.hull, state.ship.hull + restored); effects.repairRemaining -= restored; effects.repair = Math.max(0, effects.repair - dt);
        }
        game.enemies.forEach(enemy => { enemy.disabled = Math.max(0, (enemy.disabled || 0) - dt); });
    }
    function onFire(state) { const effects = effectState(state); effects.cloak = 0; }
    function isActive(state, name) { return (effectState(state)[name] || 0) > 0; }
    function heatScale(state) { const effects = effectState(state); return effects.deepFreeze > 0 ? Math.max(0, Math.min(1, Number(effects.deepFreezeScale) || 1)) : 1; }
    function slotState(state, slot) {
        const module = ns.Data.MODULES[state.ship.slots[slot]]; return { slot, module, unlocked: Boolean(ns.Unlocks.evaluate(state).abilitySlots[slot]), cooldown: cooldowns(state)[slot] || 0 };
    }
    ns.Abilities = { KEY_SLOTS, activate, update, onFire, isActive, heatScale, slotState, safeBlinkDestination };
})(window.FrontierWayfarer);
