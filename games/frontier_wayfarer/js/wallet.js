(function (ns) {
    const KEYS = ['aetherium', 'sunshards', 'helionite'];
    function empty() { return { aetherium: 0, sunshards: 0, helionite: 0 }; }
    function normalize(value) {
        const source = value || {};
        return KEYS.reduce((result, key) => { result[key] = Math.max(0, Math.round(Number(source[key]) || 0)); return result; }, empty());
    }
    function ensure(state) {
        state.pilot.wallet = state.pilot.wallet || {};
        state.pilot.wallet.banked = normalize(state.pilot.wallet.banked);
        state.pilot.wallet.unbanked = normalize(state.pilot.wallet.unbanked);
        return state.pilot.wallet;
    }
    function scale(value, multiplier) {
        const cost = normalize(value); KEYS.forEach(key => { cost[key] = Math.max(0, Math.round(cost[key] * multiplier)); }); return cost;
    }
    function canAfford(state, cost, pool) {
        const wallet = ensure(state)[pool || 'banked']; const required = normalize(cost);
        return KEYS.every(key => wallet[key] >= required[key]);
    }
    function debit(state, cost, pool) {
        const name = pool || 'banked'; if (!canAfford(state, cost, name)) return false;
        const wallet = ensure(state)[name]; const required = normalize(cost); KEYS.forEach(key => { wallet[key] -= required[key]; }); return true;
    }
    function credit(state, reward, pool) {
        const wallet = ensure(state)[pool || 'unbanked']; const value = normalize(reward); KEYS.forEach(key => { wallet[key] += value[key]; }); return value;
    }
    function deposit(state) {
        const wallet = ensure(state); const deposited = normalize(wallet.unbanked);
        KEYS.forEach(key => { wallet.banked[key] += wallet.unbanked[key]; wallet.unbanked[key] = 0; }); return deposited;
    }
    function loseUnbanked(state) { const wallet = ensure(state); const lost = normalize(wallet.unbanked); wallet.unbanked = empty(); return lost; }
    function isZero(value) { const normalized = normalize(value); return KEYS.every(key => normalized[key] === 0); }
    ns.Wallet = { KEYS, empty, normalize, ensure, scale, canAfford, debit, credit, deposit, loseUnbanked, isZero };
})(window.MiniInvadersV2);
