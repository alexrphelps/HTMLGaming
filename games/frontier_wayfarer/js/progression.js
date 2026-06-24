(function (ns) {
    const { MODULES, TRAITS } = ns.Data;

    function getTraitRank(state, id) { return state.pilot.traits[id] || 0; }
    function getDisciplineSpend(state, discipline) {
        return TRAITS.filter(t => t.discipline === discipline && !t.capstone && !t.specialization)
            .reduce((sum, t) => sum + getTraitRank(state, t.id), 0);
    }
    function capstoneAchievement(discipline) {
        return { ace: 'combat_veteran', engineer: 'master_mechanic', pathfinder: 'rim_cartographer', operator: 'career_pilot' }[discipline];
    }
    function canBuyTrait(state, id) {
        const trait = TRAITS.find(t => t.id === id);
        if (!trait || state.pilot.traitPoints < 1 || getTraitRank(state, id) >= trait.maxRank) return false;
        if (trait.specialization) {
            const capstone = TRAITS.find(item => item.discipline === trait.discipline && item.capstone);
            return Boolean(getTraitRank(state, capstone?.id)) && !TRAITS.some(item => item.specialization && item.discipline === trait.discipline && item.id !== id && getTraitRank(state, item.id));
        }
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
    function traitTotalLabel(trait, rank) {
        if (!trait?.display || rank <= 0) return '';
        if (trait.display.unit === 'capstone') return 'CAPSTONE ACTIVE';
        const value = Math.abs(Object.values(trait.effect)[0] * rank);
        const amount = trait.display.unit === 'percent' ? `${Math.round(value * 100)}%` : `${Math.round(value)}`;
        return trait.display.direction === 'less' ? `${amount} LESS ${trait.display.label}` : `+${amount} ${trait.display.label}`;
    }
    function equippedModules(state) {
        return Object.values(state.ship.slots).filter(Boolean).map(id => MODULES[id]).filter(Boolean);
    }
    function activeHull(state) { return ns.Data.HULLS[state.ship.activeHullId] || ns.Data.HULLS.wayfarer; }
    function calculateShipStats(state) {
        const effects = traitEffects(state);
        const hull = activeHull(state);
        const modules = equippedModules(state);
        const rawMass = modules.reduce((sum, m) => sum + (m.mass || 0), 0);
        const mass = rawMass * (1 + (effects.mass || 0));
        const engine = modules.find(m => m.slot === 'engine') || {};
        const reactor = modules.find(m => m.slot === 'reactor') || {};
        const defense = modules.find(m => m.slot === 'defense') || {};
        const cargo = modules.find(m => m.slot === 'cargo') || {};
        const utilities = modules.filter(m => m.slot === 'utility');
        const utility = key => utilities.reduce((sum, m) => sum + (m[key] || 0), 0);
        ['weaponHeat', 'abilityEnergyCost'].forEach(key => { effects[key] = (effects[key] || 0) + modules.reduce((sum, module) => sum + (module[key] || 0), 0); });
        const damageScale = Object.values(state.ship.moduleDamage).reduce((worst, amount) => Math.max(worst, amount || 0), 0);
        return {
            mass, massLimit: hull.massLimit + (state.ship.chassis.massLimit - 52),
            thrust: (engine.thrust || 180) * hull.thrust * (1 + (effects.thrust || 0)) * (1 - damageScale * .25),
            strafeScale: hull.strafe * (engine.strafe || 1), maxSpeed: hull.maxSpeed + (engine.maxSpeed || 0), radius: hull.radius,
            turn: (engine.turn || 2.4) * (hull.turn || 1) * (1 + (effects.turn || 0)), braking: engine.braking || 1,
            reactor: (reactor.reactor || 55) + hull.reactor + state.ship.chassis.reactorBonus + (effects.reactor || 0),
            hull: hull.hull + (state.ship.chassis.integrity - 140) + (defense.hullBonus || 0), armor: (defense.armor || 0) + (cargo.armor || 0),
            shield: (defense.shield || 0) * hull.shield * (1 + (effects.shield || 0)),
            shieldRecharge: defense.shieldRecharge || 0,
            shieldDelay: defense.shieldDelay || 0,
            cargo: Math.max(1, (cargo.cargo || 6) + hull.cargo + state.ship.chassis.cargoBonus + utility('cargo') + (effects.cargo || 0)),
            energyRecharge: (reactor.energyRecharge || 16) + (hull.energyRecharge || 0),
            cooling: Math.max(1, 15 + hull.cooling + (reactor.cooling || 0) + utility('cooling')), repair: utility('repair') * (1 + (effects.repair || 0)),
            sensor: 850 + hull.sensor + (cargo.sensor || 0) + utility('sensor') + (effects.sensor || 0),
            interactionRange: 90 + (cargo.interactionRange || 0) + utility('interactionRange'),
            collisionResistance: engine.collisionResistance || 0, heavyStability: (engine.heavyStability || 0) + (defense.heavyStability || 0),
            lightSpeed: Boolean(engine.lightSpeed && reactor.lightSpeedSupport), lightTurn: engine.lightTurn || 1, lightCharge: engine.lightCharge || 1, lightDeceleration: engine.lightDeceleration || 1,
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
    function checkEquipModule(state, slot, moduleId) {
        const module = MODULES[moduleId];
        const unlocks = ns.Unlocks.evaluate(state);
        if (!module) return { ok: false, reason: 'missing' };
        if (!state.ship.ownedModules.includes(moduleId)) return { ok: false, reason: 'unowned' };
        if (!slotAccepts(slot, module)) return { ok: false, reason: 'slot' };
        if (module.stargateSystem && !ns.Galaxies.isHighestTierHull(state)) return { ok: false, reason: 'hull-tier' };
        if (slot.startsWith('ability') && !unlocks.abilitySlots[slot]) return { ok: false, reason: 'locked' };
        const old = state.ship.slots[slot];
        const previousSlot = Object.keys(state.ship.slots).find(key => key !== slot && state.ship.slots[key] === moduleId);
        if (previousSlot) state.ship.slots[previousSlot] = null;
        state.ship.slots[slot] = moduleId;
        if (calculateShipStats(state).mass > calculateShipStats(state).massLimit) {
            state.ship.slots[slot] = old;
            if (previousSlot) state.ship.slots[previousSlot] = moduleId;
            return { ok: false, reason: 'mass' };
        }
        state.ship.slots[slot] = old;
        if (previousSlot) state.ship.slots[previousSlot] = moduleId;
        return { ok: true };
    }
    function equipModule(state, slot, moduleId) {
        const check = checkEquipModule(state, slot, moduleId);
        if (!check.ok) return false;
        const previousSlot = Object.keys(state.ship.slots).find(key => key !== slot && state.ship.slots[key] === moduleId);
        if (previousSlot) state.ship.slots[previousSlot] = null;
        state.ship.slots[slot] = moduleId;
        return true;
    }
    function cargoUsed(state) { return Object.values(state.ship.cargo).reduce((sum, qty) => sum + qty, 0); }
    function checkSwitchHull(state, hullId) {
        const hull = ns.Data.HULLS[hullId];
        if (!state.dockedAt) return { ok: false, reason: 'dock' };
        if (!hull || !state.ship.ownedHullIds.includes(hullId)) return { ok: false, reason: 'unowned' };
        if (!ns.Galaxies.isHighestTierHull(hull) && Object.values(state.ship.slots).some(moduleId => MODULES[moduleId]?.stargateSystem)) return { ok: false, reason: 'hull-tier' };
        const previous = state.ship.activeHullId; state.ship.activeHullId = hullId; const stats = calculateShipStats(state); state.ship.activeHullId = previous;
        if (stats.mass > stats.massLimit) return { ok: false, reason: 'mass' };
        if (cargoUsed(state) > stats.cargo) return { ok: false, reason: 'cargo' };
        return { ok: true };
    }
    function switchHull(state, hullId) {
        const check = checkSwitchHull(state, hullId); if (!check.ok) return check;
        state.ship.activeHullId = hullId; const stats = calculateShipStats(state);
        state.ship.name = ns.Data.HULLS[hullId].name;
        state.ship.hull = Math.min(state.ship.hull, stats.hull); state.ship.shield = Math.min(state.ship.shield, stats.shield); state.ship.energy = Math.min(state.ship.energy, stats.reactor);
        return { ok: true };
    }
    function buyHull(state, hullId, station) {
        const hull = ns.Data.HULLS[hullId];
        if (!hull || state.ship.ownedHullIds.includes(hullId) || !ns.Expansion.hullAvailable(state, hull, station) || !ns.Wallet.debit(state, hull.cost)) return false;
        state.ship.ownedHullIds.push(hullId); return true;
    }
    function updateAchievements(state) {
        const a = state.pilot.achievements;
        if (state.stats.kills >= 20) a.combat_veteran = true;
        if (state.stats.repairs >= 500) a.master_mechanic = true;
        if (state.stats.discoveries >= 7) a.rim_cartographer = true;
        if (state.stats.contracts >= 12) a.career_pilot = true;
        return a;
    }

    ns.Progression = { getTraitRank, getDisciplineSpend, canBuyTrait, buyTrait, respecCost, respec, traitEffects, traitTotalLabel, activeHull, calculateShipStats, checkEquipModule, equipModule, cargoUsed, checkSwitchHull, switchHull, buyHull, updateAchievements };
})(window.FrontierWayfarer);
