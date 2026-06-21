(function (ns) {
    const { COMMODITIES, REGIONS, MODULES } = ns.Data;
    const { clamp, hash } = ns.MathUtil;

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
    }
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
        if (!module || (module.majorOnly && !station?.major) || !ns.Unlocks.moduleVisible(state, module) || state.ship.ownedModules.includes(moduleId) || !ns.Wallet.debit(state, module.cost)) return false;
        state.ship.ownedModules.push(moduleId); return true;
    }
    function driftMarkets(state) {
        Object.values(state.economy).forEach(m => { m.supply = clamp(m.supply + (50 - m.supply) * .04, 5, 120); });
    }
    ns.Economy = { marketKey, ensureMarket, price, trade, buyModule, driftMarkets };
})(window.MiniInvadersV2);
