(function (ns) {
    const { COMMODITIES, REGIONS, MODULES } = ns.Data;
    const { clamp, hash, seeded } = ns.MathUtil;
    const INVENTORY_CYCLE_SECONDS = 20 * 60;

    function marketKey(stationId, commodityId) { return `${stationId}:${commodityId}`; }
    function ensureMarket(state, station) {
        const region = REGIONS.find(r => r.id === station.region) || REGIONS[0];
        Object.keys(COMMODITIES).forEach(id => {
            const key = marketKey(station.id, id);
            if (!state.economy[key]) {
                const variation = .88 + hash(state.worldSeed, station.x, station.y, id.length) * .24;
                state.economy[key] = { supply: 45 + Math.round(hash(state.worldSeed, station.x, station.y, id.length + 20) * 55), modifier: variation * (region.economy[id] || 1) };
            }
        });
        inventoryFor(state, station);
    }
    function pick(pool, count, rand, chosen) {
        const available = pool.filter(id => !chosen.includes(id));
        while (available.length && count-- > 0) chosen.push(available.splice(Math.floor(rand() * available.length), 1)[0]);
        return chosen;
    }
    function pickWeighted(pool, count, rand, chosen, weightFor) {
        const available = pool.filter(id => !chosen.includes(id));
        while (available.length && count-- > 0) {
            const weights = available.map(id => Math.max(.01, weightFor(id))), total = weights.reduce((sum, value) => sum + value, 0); let roll = rand() * total, index = 0;
            for (; index < available.length - 1; index++) { roll -= weights[index]; if (roll <= 0) break; }
            chosen.push(available.splice(index, 1)[0]);
        }
        return chosen;
    }
    function galaxyAllowsModule(state, module) {
        if (state.galaxyId !== 'galaxy_a') return true;
        if (module.id === 'light_drive' || module.stargateSystem) return true;
        return (module.tier || 1) <= 2;
    }
    function moduleEligibleForStation(state, station, module) {
        return Boolean(module && module.cost && !ns.Wallet.isZero(module.cost) && (!module.majorOnly || station?.major) && ns.Unlocks.moduleVisible(state, module) && galaxyAllowsModule(state, module));
    }
    function moduleEligibleForLoot(state, module) {
        return Boolean(module && module.cost && !ns.Wallet.isZero(module.cost) && ns.Unlocks.moduleVisible(state, module) && galaxyAllowsModule(state, module));
    }
    function inventoryFor(state, station) {
        state.marketInventories = state.marketInventories || {};
        const cycle = Math.floor((Number(state.playTime) || 0) / INVENTORY_CYCLE_SECONDS), saved = state.marketInventories[station.id];
        const visibleRequestPool = sold => Object.keys(COMMODITIES).filter(id => !sold.includes(id) && ns.Unlocks.commodityVisible(state, COMMODITIES[id]));
        if (saved?.cycle === cycle) {
            saved.commodities = Array.isArray(saved.commodities) ? saved.commodities : [];
            saved.requests = Array.isArray(saved.requests) ? saved.requests.filter(id => !saved.commodities.includes(id)) : [];
            saved.modules = Array.isArray(saved.modules) ? saved.modules.filter(id => moduleEligibleForStation(state, station, MODULES[id])) : [];
            if (!saved.requests.some(id => ns.Unlocks.commodityVisible(state, COMMODITIES[id]))) saved.requests = [];
            if (!saved.requests.length) pick(visibleRequestPool(saved.commodities).length ? visibleRequestPool(saved.commodities) : Object.keys(COMMODITIES).filter(id => !saved.commodities.includes(id)), station.major ? 2 : 1, seeded((state.worldSeed ^ station.x ^ station.y ^ cycle * 1319 ^ 0x5e11) >>> 0), saved.requests);
            const useful = Object.values(MODULES).find(module => moduleEligibleForStation(state, station, module) && !state.ship.ownedModules.includes(module.id));
            if (useful && !saved.modules.includes(useful.id)) saved.modules.push(useful.id);
            if (station.major && MODULES.light_drive && moduleEligibleForStation(state, station, MODULES.light_drive) && !saved.modules.includes('light_drive')) saved.modules.push('light_drive');
            Object.values(MODULES).filter(module => module.vendors?.includes(station.id) && moduleEligibleForStation(state, station, module)).forEach(module => { if (!saved.modules.includes(module.id)) saved.modules.push(module.id); });
            if (station.major) Object.values(MODULES).filter(module => module.stargateSystem && moduleEligibleForStation(state, station, module)).forEach(module => { if (!saved.modules.includes(module.id)) saved.modules.push(module.id); });
            return saved;
        }
        const commodityIds = Object.keys(COMMODITIES), moduleIds = Object.values(MODULES).filter(module => moduleEligibleForStation(state, station, module)).map(module => module.id);
        const identity = seeded((state.worldSeed ^ station.x ^ station.y ^ 0x51f15e) >>> 0), rotation = seeded((state.worldSeed ^ station.x ^ station.y ^ cycle * 977 ^ 0xa11ce) >>> 0);
        const commodities = []; pick(commodityIds, station.major ? 2 : 1, identity, commodities); pick(commodityIds, 1, rotation, commodities);
        const requestPool = visibleRequestPool(commodities);
        const requests = []; pick(requestPool.length ? requestPool : commodityIds.filter(id => !commodities.includes(id)), station.major ? 2 : 1, seeded((state.worldSeed ^ station.x ^ station.y ^ cycle * 1319 ^ 0x5e11) >>> 0), requests);
        const preferredSlots = station.faction === 'concord' ? ['defense', 'primary'] : station.faction === 'corsairs' ? ['primary', 'utility'] : ['engine', 'cargo', 'utility'];
        const preferred = moduleIds.filter(id => preferredSlots.includes(MODULES[id].slot)), modules = [];
        const remoteness = REGIONS.find(region => region.id === station.region)?.remoteness || 0, moduleWeight = id => 1 + remoteness * Math.max(0, (MODULES[id].tier || 1) - 1) * 1.5;
        pickWeighted(preferred, station.major ? 4 : 2, identity, modules, moduleWeight); pickWeighted(moduleIds, station.major ? 3 : 2, rotation, modules, moduleWeight);
        if (station.major && moduleIds.includes('light_drive') && !modules.includes('light_drive')) modules.push('light_drive');
        if (station.major) Object.values(MODULES).filter(module => module.stargateSystem && moduleEligibleForStation(state, station, module)).forEach(module => { if (!modules.includes(module.id)) modules.push(module.id); });
        const useful = moduleIds.find(id => !state.ship.ownedModules.includes(id)); if (useful && !modules.includes(useful)) modules.push(useful);
        Object.values(MODULES).filter(module => module.vendors?.includes(station.id) && moduleEligibleForStation(state, station, module)).forEach(module => { if (!modules.includes(module.id)) modules.push(module.id); });
        const inventory = { cycle, commodities, requests, modules, refreshedAt: Number(state.playTime) || 0 }; state.marketInventories[station.id] = inventory; return inventory;
    }
    function stocksCommodity(state, station, commodityId) { return inventoryFor(state, station).commodities.includes(commodityId); }
    function requestsCommodity(state, station, commodityId) { return inventoryFor(state, station).requests.includes(commodityId); }
    function stocksModule(state, station, moduleId) { return inventoryFor(state, station).modules.includes(moduleId); }
    function tradeReputationGain(state, station, commodityId, amount) {
        if (!station?.faction || !(station.faction in state.reputations) || !requestsCommodity(state, station, commodityId)) return 0;
        const effects = ns.Progression.traitEffects(state), gain = Math.max(1, Math.round(Math.sqrt(Math.max(1, amount)) * (1 + (effects.reputation || 0))));
        state.reputations[station.faction] = clamp((state.reputations[station.faction] || 0) + gain, -100, 100);
        return gain;
    }
    function price(state, station, commodityId, side) {
        ensureMarket(state, station);
        const market = state.economy[marketKey(station.id, commodityId)];
        const commodity = COMMODITIES[commodityId];
        const pressure = clamp(1.25 - market.supply / 180, .72, 1.35);
        const trait = ns.Progression.traitEffects(state).market || 0;
        const allegianceDiscount = state.pilot.allegiance === station.faction ? .05 : 0;
        const serviceDiscount = side === 'buy' && state.progression.serviceDiscount?.stationId === station.id && state.progression.serviceDiscount.uses > 0 ? state.progression.serviceDiscount.value : 0;
        const requestPremium = side === 'sell' && requestsCommodity(state, station, commodityId) ? .34 : 0;
        const spread = side === 'sell' ? .88 + trait + allegianceDiscount + requestPremium : 1.12 - trait - allegianceDiscount - serviceDiscount;
        return Math.max(1, Math.round(commodity.basePrice * market.modifier * pressure * spread));
    }
    function trade(state, station, commodityId, quantity) {
        if (!ns.Unlocks.commodityVisible(state, COMMODITIES[commodityId])) return false;
        ensureMarket(state, station);
        const market = state.economy[marketKey(station.id, commodityId)];
        if (quantity > 0) {
            if (!stocksCommodity(state, station, commodityId)) return false;
            const available = Math.min(quantity, market.supply, ns.Progression.calculateShipStats(state).cargo - ns.Progression.cargoUsed(state));
            const cost = { aetherium: price(state, station, commodityId, 'buy') * available };
            if (available <= 0 || !ns.Wallet.debit(state, cost)) return false;
            state.ship.cargo[commodityId] = (state.ship.cargo[commodityId] || 0) + available; market.supply -= available;
        } else {
            if (!requestsCommodity(state, station, commodityId)) return false;
            const amount = Math.min(-quantity, state.ship.cargo[commodityId] || 0);
            if (amount <= 0) return false;
            ns.Wallet.credit(state, { aetherium: price(state, station, commodityId, 'sell') * amount }, 'banked'); state.ship.cargo[commodityId] -= amount; market.supply += amount;
            tradeReputationGain(state, station, commodityId, amount);
        }
        if (quantity > 0 && state.progression.serviceDiscount?.stationId === station.id && state.progression.serviceDiscount.uses > 0) state.progression.serviceDiscount.uses--;
        state.stats.trades++; ns.Objectives?.record(state, 'trades', 1); return true;
    }
    function buyModule(state, moduleId, station) {
        const module = MODULES[moduleId];
        if (!module || (module.majorOnly && !station?.major) || !ns.Unlocks.moduleVisible(state, module) || !stocksModule(state, station, moduleId) || state.ship.ownedModules.includes(moduleId) || !ns.Wallet.debit(state, module.cost)) return false;
        state.ship.ownedModules.push(moduleId); return true;
    }
    function moduleResaleValue(state, station, moduleId) {
        const module = MODULES[moduleId], base = ns.Wallet.normalize(module?.cost);
        if (!module || ns.Wallet.isZero(base)) return ns.Wallet.empty();
        const market = ns.Progression.traitEffects(state).market || 0, stationTrust = station?.faction && state.pilot.allegiance === station.faction ? .05 : 0;
        return ns.Wallet.scale(base, .45 + market + stationTrust);
    }
    function checkSellModule(state, moduleId) {
        const module = MODULES[moduleId];
        if (!module || !state.ship.ownedModules.includes(moduleId)) return { ok: false, reason: 'unowned', value: ns.Wallet.empty() };
        if (Object.values(state.ship.slots || {}).includes(moduleId)) return { ok: false, reason: 'equipped', value: moduleResaleValue(state, null, moduleId) };
        if (ns.Wallet.isZero(module.cost)) return { ok: false, reason: 'starter', value: ns.Wallet.empty() };
        return { ok: true, reason: null, value: moduleResaleValue(state, null, moduleId) };
    }
    function sellModule(state, moduleId, station) {
        const check = checkSellModule(state, moduleId);
        const value = moduleResaleValue(state, station, moduleId);
        if (!check.ok) return Object.assign({}, check, { value });
        state.ship.ownedModules = state.ship.ownedModules.filter(id => id !== moduleId);
        ns.Wallet.credit(state, value, 'banked');
        return { ok: true, reason: null, value };
    }
    function driftMarkets(state) {
        Object.values(state.economy).forEach(m => { m.supply = clamp(m.supply + (50 - m.supply) * .04, 5, 120); });
    }
    ns.Economy = { INVENTORY_CYCLE_SECONDS, marketKey, ensureMarket, inventoryFor, moduleEligibleForStation, moduleEligibleForLoot, stocksCommodity, requestsCommodity, stocksModule, tradeReputationGain, price, trade, buyModule, moduleResaleValue, checkSellModule, sellModule, driftMarkets };
})(window.FrontierWayfarer);
