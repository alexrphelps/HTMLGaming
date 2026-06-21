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
    function inventoryFor(state, station) {
        state.marketInventories = state.marketInventories || {};
        const cycle = Math.floor((Number(state.playTime) || 0) / INVENTORY_CYCLE_SECONDS), saved = state.marketInventories[station.id];
        if (saved?.cycle === cycle) return saved;
        const commodityIds = Object.keys(COMMODITIES), moduleIds = Object.values(MODULES).filter(module => module.cost && !ns.Wallet.isZero(module.cost) && (!module.majorOnly || station.major)).map(module => module.id);
        const identity = seeded((state.worldSeed ^ station.x ^ station.y ^ 0x51f15e) >>> 0), rotation = seeded((state.worldSeed ^ station.x ^ station.y ^ cycle * 977 ^ 0xa11ce) >>> 0);
        const commodities = []; pick(commodityIds, station.major ? 2 : 1, identity, commodities); pick(commodityIds, 1, rotation, commodities);
        const preferredSlots = station.faction === 'concord' ? ['defense', 'primary'] : station.faction === 'corsairs' ? ['primary', 'utility'] : ['engine', 'cargo', 'utility'];
        const preferred = moduleIds.filter(id => preferredSlots.includes(MODULES[id].slot)), modules = [];
        const remoteness = REGIONS.find(region => region.id === station.region)?.remoteness || 0, moduleWeight = id => 1 + remoteness * Math.max(0, (MODULES[id].tier || 1) - 1) * 1.5;
        pickWeighted(preferred, station.major ? 4 : 2, identity, modules, moduleWeight); pickWeighted(moduleIds, station.major ? 3 : 2, rotation, modules, moduleWeight);
        if (station.major && moduleIds.includes('light_drive') && !modules.includes('light_drive')) modules.push('light_drive');
        const inventory = { cycle, commodities, modules, refreshedAt: Number(state.playTime) || 0 }; state.marketInventories[station.id] = inventory; return inventory;
    }
    function stocksCommodity(state, station, commodityId) { return inventoryFor(state, station).commodities.includes(commodityId); }
    function stocksModule(state, station, moduleId) { return inventoryFor(state, station).modules.includes(moduleId); }
    function price(state, station, commodityId, side) {
        ensureMarket(state, station);
        const market = state.economy[marketKey(station.id, commodityId)];
        const commodity = COMMODITIES[commodityId];
        const pressure = clamp(1.25 - market.supply / 180, .72, 1.35);
        const trait = ns.Progression.traitEffects(state).market || 0;
        const allegianceDiscount = state.pilot.allegiance === station.faction ? .05 : 0;
        const spread = side === 'sell' ? .88 + trait + allegianceDiscount : 1.12 - trait - allegianceDiscount;
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
            const amount = Math.min(-quantity, state.ship.cargo[commodityId] || 0);
            if (amount <= 0) return false;
            ns.Wallet.credit(state, { aetherium: price(state, station, commodityId, 'sell') * amount }, 'banked'); state.ship.cargo[commodityId] -= amount; market.supply += amount;
        }
        state.stats.trades++; return true;
    }
    function buyModule(state, moduleId, station) {
        const module = MODULES[moduleId];
        if (!module || (module.majorOnly && !station?.major) || !ns.Unlocks.moduleVisible(state, module) || !stocksModule(state, station, moduleId) || state.ship.ownedModules.includes(moduleId) || !ns.Wallet.debit(state, module.cost)) return false;
        state.ship.ownedModules.push(moduleId); return true;
    }
    function driftMarkets(state) {
        Object.values(state.economy).forEach(m => { m.supply = clamp(m.supply + (50 - m.supply) * .04, 5, 120); });
    }
    ns.Economy = { INVENTORY_CYCLE_SECONDS, marketKey, ensureMarket, inventoryFor, stocksCommodity, stocksModule, price, trade, buyModule, driftMarkets };
})(window.MiniInvadersV2);
