(function (ns) {
    const { clamp, distance, hash } = ns.MathUtil;

    function objectDefinition(entity) { return ns.Registry.get('worldObject', entity?.typeId) || null; }
    function scenarioDefinition(entity) { return ns.Registry.get('worldEvent', entity?.typeId) || null; }
    function scaledReward(definition, danger) {
        const reward = Object.assign({ aetherium: 0, sunshards: 0, helionite: 0 }, definition.reward);
        Object.entries(definition.dangerScale || {}).forEach(([currency, amount]) => { reward[currency] += Math.max(0, danger - 1) * amount; });
        if (definition.helioniteAt && danger >= definition.helioniteAt) reward.helionite += 1 + Math.floor((danger - definition.helioniteAt) / 2);
        return reward;
    }
    function rewardText(reward) {
        return [['aetherium', 'AE'], ['sunshards', 'SS'], ['helionite', 'HE']].filter(([id]) => reward[id] > 0).map(([id, label]) => `+${reward[id]} ${label}`).join(' // ');
    }
    function moduleLootPool(game, definition, danger) {
        const loot = definition.moduleLoot || {};
        return Object.values(ns.Data.MODULES).filter(module => {
            if (!module.cost || ns.Wallet.isZero(module.cost)) return false;
            if (loot.slots?.length && !loot.slots.includes(module.slot)) return false;
            if ((module.tier || 1) < (loot.minTier || 1) || (module.tier || 1) > (loot.maxTier || 99)) return false;
            if (module.majorOnly && !game.state.dockedAt && (module.tier || 1) < 5) return false;
            if (danger < (loot.minDanger || 0)) return false;
            return ns.Unlocks.moduleVisible(game.state, module);
        });
    }
    function resolveModuleLoot(game, entity, definition, danger, reward) {
        if (!definition.moduleLoot) return null;
        const pool = moduleLootPool(game, definition, danger);
        if (!pool.length) return null;
        const roll = hash(game.state.worldSeed, Math.round(entity.x), Math.round(entity.y), definition.id.length);
        const module = pool[Math.floor(roll * pool.length) % pool.length];
        if (!module) return null;
        if (game.state.ship.ownedModules.includes(module.id)) {
            const fallback = ns.Wallet.scale(module.cost, .2);
            ns.Wallet.KEYS.forEach(key => { reward[key] = (reward[key] || 0) + fallback[key]; });
            return { module, duplicate: true, fallback };
        }
        game.state.ship.ownedModules.push(module.id);
        return { module, duplicate: false, fallback: null };
    }
    function interactionDuration(entity) { return (entity?.kind === 'worldScenario' ? scenarioDefinition(entity) : objectDefinition(entity))?.interactionDuration || 5; }
    function interact(game, entity) {
        const definition = objectDefinition(entity); if (!definition || !game.world.consumeEntity(game.state, entity)) return false;
        const effects = ns.Progression.traitEffects(game.state), danger = ns.Data.REGIONS.find(region => region.id === entity.region)?.danger || game.region?.danger || 1;
        const reward = entity.reward ? Object.assign({ aetherium: 0, sunshards: 0, helionite: 0 }, entity.reward) : scaledReward(definition, danger), multiplier = entity.typeId === 'ancient_relic' ? 1 : definition.rewardType === 'salvage' ? 1 + (effects.salvage || 0) : 1 + (effects.discoveryReward || 0);
        Object.keys(reward).forEach(currency => { reward[currency] = Math.round(reward[currency] * multiplier); });
        const moduleLoot = resolveModuleLoot(game, entity, definition, danger, reward);
        ns.Wallet.credit(game.state, reward); ns.State.addExperience(game.state, definition.xp || 0); game.world.discover(game.state, entity);
        if (entity.typeId === 'ancient_relic') ns.Objectives.record(game.state, 'relic', 1);
        if (definition.heat) game.state.ship.heat = clamp(game.state.ship.heat + definition.heat * ns.Abilities.heatScale(game.state), 0, 100);
        if (definition.energyDrain) game.state.ship.energy = Math.max(0, game.state.ship.energy - definition.energyDrain);
        const handler = ns.Registry.handler('worldObject', definition.handlerId || (definition.moduleLoot ? 'module_cache' : entity.typeId)) || ns.Registry.handler('worldObject', 'default'); handler({ game, entity, definition, danger, reward, moduleLoot });
        return true;
    }
    function positiveStanding(game, faction, amount) {
        const effects = ns.Progression.traitEffects(game.state), gain = Math.max(1, Math.round(amount * (1 + (effects.reputation || 0))));
        game.state.reputations[faction] = clamp((game.state.reputations[faction] || 0) + gain, -100, 100); return gain;
    }
    function distressIsFalse(game, entity, definition) {
        const region = ns.Data.REGIONS.find(item => item.id === entity.region) || game.region, chance = definition.falseSignalChance?.[region.backdrop] || 0;
        return hash(game.state.worldSeed, Math.round(entity.x), Math.round(entity.y), 91) < chance;
    }
    function activate(game, entity) {
        const definition = scenarioDefinition(entity); if (!definition || !game.world.consumeEntity(game.state, entity)) return false;
        const danger = ns.Data.REGIONS.find(region => region.id === entity.region)?.danger || game.region?.danger || 1;
        const handler = ns.Registry.handler('worldEvent', definition.handlerId || entity.typeId) || ns.Registry.handler('worldEvent', 'default'); handler({ game, entity, definition, danger }); game.save(); game.ui.renderAll(game); return true;
    }
    function update(game) {
        if (!game.state || game.state.dockedAt || ns.LightSpeed.isTraveling(game)) return false;
        const scenarios = game.world.loadedEntities().filter(entity => entity.kind === 'worldScenario').sort((a, b) => distance(a, game.state.ship) - distance(b, game.state.ship));
        const target = scenarios.find(entity => !scenarioDefinition(entity)?.requiresInteraction && distance(entity, game.state.ship) <= (scenarioDefinition(entity)?.triggerRadius || 400) && (!scenarioDefinition(entity)?.hostile || game.enemies.length === 0));
        return target ? activate(game, target) : false;
    }

    ns.Registry.registerHandler('worldObject', 'default', ({ game, definition, reward }) => game.notify(`${definition.name.toUpperCase()} SECURED // ${rewardText(reward)}`));
    ns.Registry.registerHandler('worldObject', 'smuggler_dead_drop', ({ game, entity, danger, reward }) => { if (entity.variant === 'guarded') { game.spawnEnemies(2 + Math.floor(danger / 3), entity); game.notify(`DEAD DROP OPEN // ${rewardText(reward)} // RAIDER RESPONSE`); } else game.notify(`DEAD DROP OPEN // ${rewardText(reward)}`); });
    ns.Registry.registerHandler('worldObject', 'unstable_prism', ({ game, reward }) => game.notify(`PRISM SURVEY LOGGED // ${rewardText(reward)} // SYSTEM LOAD SPIKE`));
    ns.Registry.registerHandler('worldObject', 'ancient_relic', ({ game, reward }) => game.notify(`ANCIENT RELIC RECOVERED // ${rewardText(reward)}`));
    ns.Registry.registerHandler('worldObject', 'module_cache', ({ game, entity, danger, reward, moduleLoot }) => { if (entity.variant === 'guarded') game.spawnEnemies(1 + Math.floor(danger / 3), entity); const loot = moduleLoot ? moduleLoot.duplicate ? `${moduleLoot.module.name.toUpperCase()} DUPLICATE // ${rewardText(moduleLoot.fallback)}` : `${moduleLoot.module.name.toUpperCase()} ADDED TO HOLD` : rewardText(reward); game.notify(`MODULE CACHE OPEN // ${loot}`); });
    ns.Registry.registerHandler('worldEvent', 'default', ({ game, definition }) => game.notify(`${definition.name.toUpperCase()} // EVENT RESOLVED`));
    ns.Registry.registerHandler('worldEvent', 'distress_call', ({ game, entity, definition, danger }) => { if (distressIsFalse(game, entity, definition)) { game.spawnEnemies(Math.min(4, 1 + Math.ceil(danger / 2)), entity); game.notify('FALSE DISTRESS SIGNAL // BANDIT AMBUSH'); } else { const reward = { aetherium: 45 + danger * 8, sunshards: 1, helionite: 0 }, standing = positiveStanding(game, 'independents', 1); ns.Wallet.credit(game.state, reward); ns.State.addExperience(game.state, 28); game.notify(`PILOT RECOVERED // +${reward.aetherium} AE // +${standing} GUILD STANDING`); } });
    ns.Registry.registerHandler('worldEvent', 'border_skirmish', ({ game, entity }) => { game.spawnEnemies(2, { x: entity.x - 140, y: entity.y }, 'concord', 'world-event', 'concord_patrol'); game.spawnEnemies(2, { x: entity.x + 140, y: entity.y }, 'corsairs', 'world-event', 'corsair_raider'); game.notify('BORDER SKIRMISH // CONCORD AND CORSAIR CONTACTS'); });
    ns.Registry.registerHandler('worldEvent', 'raider_sweep', ({ game, entity, danger }) => { game.spawnEnemies(Math.min(4, 1 + Math.ceil(danger / 2)), entity); game.notify('RAIDER SWEEP // HOSTILES INBOUND'); });
    ns.Registry.registerHandler('worldEvent', 'abandoned_worksite', ({ game }) => { ns.State.addExperience(game.state, 8); game.notify('ABANDONED WORKSITE // RECOVERABLE STORES DETECTED'); });
    ns.WorldEvents = { objectDefinition, scenarioDefinition, scaledReward, moduleLootPool, interactionDuration, distressIsFalse, interact, activate, update };
})(window.MiniInvadersV2);
