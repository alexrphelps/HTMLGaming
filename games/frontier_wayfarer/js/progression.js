(function (ns) {
    const { MODULES, TRAITS } = ns.Data;

    function getTraitRank(state, id) { return state.pilot.traits[id] || 0; }
    function getDisciplineSpend(state, discipline) {
        return TRAITS.filter(t => t.discipline === discipline && !t.capstone)
            .reduce((sum, t) => sum + getTraitRank(state, t.id), 0);
    }
    function capstoneAchievement(discipline) {
        return { ace: 'combat_veteran', engineer: 'master_mechanic', pathfinder: 'rim_cartographer', operator: 'career_pilot' }[discipline];
    }
    function canBuyTrait(state, id) {
        const trait = TRAITS.find(t => t.id === id);
        if (!trait || state.pilot.traitPoints < 1 || getTraitRank(state, id) >= trait.maxRank) return false;
        if (!trait.capstone) return true;
        return getDisciplineSpend(state, trait.discipline) >= 8 && Boolean(state.pilot.achievements[capstoneAchievement(trait.discipline)]);
    }
    function buyTrait(state, id) {
        if (!canBuyTrait(state, id)) return false;
        state.pilot.traits[id] = getTraitRank(state, id) + 1;
        state.pilot.traitPoints--;
        return true;
    }
    function respecCost(state) { return { aetherium: 150 + state.pilot.level * state.pilot.level * 10, sunshards: Math.max(0, state.pilot.level - 2) * 2, helionite: 0 }; }
    function respec(state) {
        const cost = respecCost(state);
        if (!ns.Wallet.debit(state, cost)) return false;
        const spent = Object.values(state.pilot.traits).reduce((a, b) => a + b, 0);
        state.pilot.traitPoints += spent;
        state.pilot.traits = {};
        return true;
    }
    function traitEffects(state) {
        const effects = {};
        TRAITS.forEach(trait => {
            const rank = getTraitRank(state, trait.id);
            if (!rank) return;
            Object.entries(trait.effect).forEach(([key, value]) => { effects[key] = (effects[key] || 0) + value * rank; });
        });
        return effects;
    }
    function equippedModules(state) {
        return Object.values(state.ship.slots).filter(Boolean).map(id => MODULES[id]).filter(Boolean);
    }
    function calculateShipStats(state) {
        const effects = traitEffects(state);
        const modules = equippedModules(state);
        const rawMass = modules.reduce((sum, m) => sum + (m.mass || 0), 0);
        const mass = rawMass * (1 + (effects.mass || 0));
        const engine = modules.find(m => m.slot === 'engine') || {};
        const reactor = modules.find(m => m.slot === 'reactor') || {};
        const defense = modules.find(m => m.slot === 'defense') || {};
        const cargo = modules.find(m => m.slot === 'cargo') || {};
        const utilities = modules.filter(m => m.slot === 'utility');
        const utility = key => utilities.reduce((sum, m) => sum + (m[key] || 0), 0);
        const damageScale = Object.values(state.ship.moduleDamage).reduce((worst, amount) => Math.max(worst, amount || 0), 0);
        return {
            mass, massLimit: state.ship.chassis.massLimit,
            thrust: (engine.thrust || 180) * (1 + (effects.thrust || 0)) * (1 - damageScale * .25),
            turn: (engine.turn || 2.4) * (1 + (effects.turn || 0)),
            reactor: (reactor.reactor || 55) + state.ship.chassis.reactorBonus + (effects.reactor || 0),
            hull: state.ship.chassis.integrity,
            shield: (defense.shield || 0) * (1 + (effects.shield || 0)),
            shieldRecharge: defense.shieldRecharge || 0,
            shieldDelay: defense.shieldDelay || 0,
            cargo: (cargo.cargo || 6) + state.ship.chassis.cargoBonus + utility('cargo') + (effects.cargo || 0),
            cooling: 13 + utility('cooling'), repair: utility('repair') * (1 + (effects.repair || 0)),
            sensor: 850 + utility('sensor') + (effects.sensor || 0),
            effects
        };
    }
    function slotAccepts(slot, module) {
        if (!module) return false;
        if (slot.startsWith('primary')) return module.slot === 'primary';
        if (slot.startsWith('utility')) return module.slot === 'utility';
        if (slot.startsWith('ability')) return module.slot === 'ability';
        return slot === module.slot;
    }
    function equipModule(state, slot, moduleId) {
        const module = MODULES[moduleId];
        const unlocks = ns.Unlocks.evaluate(state);
        if (!module || !state.ship.ownedModules.includes(moduleId) || !slotAccepts(slot, module)) return false;
        if (slot.startsWith('ability') && !unlocks.abilitySlots[slot]) return false;
        const old = state.ship.slots[slot];
        const previousSlot = Object.keys(state.ship.slots).find(key => key !== slot && state.ship.slots[key] === moduleId);
        if (previousSlot) state.ship.slots[previousSlot] = null;
        state.ship.slots[slot] = moduleId;
        if (calculateShipStats(state).mass > state.ship.chassis.massLimit) {
            state.ship.slots[slot] = old;
            if (previousSlot) state.ship.slots[previousSlot] = moduleId;
            return false;
        }
        return true;
    }
    function cargoUsed(state) { return Object.values(state.ship.cargo).reduce((sum, qty) => sum + qty, 0); }
    function updateAchievements(state) {
        const a = state.pilot.achievements;
        if (state.stats.kills >= 20) a.combat_veteran = true;
        if (state.stats.repairs >= 500) a.master_mechanic = true;
        if (state.stats.discoveries >= 7) a.rim_cartographer = true;
        if (state.stats.contracts >= 12) a.career_pilot = true;
        return a;
    }

    ns.Progression = { getTraitRank, getDisciplineSpend, canBuyTrait, buyTrait, respecCost, respec, traitEffects, calculateShipStats, equipModule, cargoUsed, updateAchievements };
})(window.MiniInvadersV2);
