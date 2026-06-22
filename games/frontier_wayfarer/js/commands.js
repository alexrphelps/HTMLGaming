(function (ns) {
    function result(ok, reason, changes) { return { ok: Boolean(ok), reason: reason || null, changes: changes || {} }; }
    function stationFor(state) { return ns.Registry.get('landmark', state.dockedAt); }
    const Commands = {
        equip(state, slot, moduleId) {
            if (!state.dockedAt) return result(false, 'dock-required');
            const check = ns.Progression.checkEquipModule(state, slot, moduleId);
            if (!check.ok) return result(false, check.reason);
            return result(ns.Progression.equipModule(state, slot, moduleId), null, { slot, moduleId });
        },
        upgradeChassis(state) {
            if (!state.dockedAt) return result(false, 'dock-required');
            if (state.ship.chassis.level >= 5) return result(false, 'maximum-level');
            const cost = { aetherium: state.ship.chassis.level * 700, helionite: state.ship.chassis.level * 5 };
            if (!ns.Wallet.canAfford(state, cost)) return result(false, 'insufficient-credits', { cost });
            if (!ns.Wallet.debit(state, cost)) return result(false, 'payment-failed', { cost });
            state.ship.chassis.level++; state.ship.chassis.integrity += 35; state.ship.chassis.massLimit += 10; state.ship.chassis.reactorBonus += 8; state.ship.chassis.cargoBonus += 3;
            state.ship.hull = ns.Progression.calculateShipStats(state).hull;
            return result(true, null, { cost, level: state.ship.chassis.level });
        },
        toggleInsurance(state) {
            if (!state.dockedAt) return result(false, 'dock-required');
            if (state.ship.insured) { state.ship.insured = false; return result(true, null, { insured: false }); }
            const cost = { aetherium: 300 };
            if (!ns.Wallet.canAfford(state, cost)) return result(false, 'insufficient-credits', { cost });
            if (!ns.Wallet.debit(state, cost)) return result(false, 'payment-failed', { cost });
            state.ship.insured = true; return result(true, null, { insured: true, cost });
        },
        joinFaction(state, factionId) { return result(ns.Contracts.joinFaction(state, factionId), 'requirements-not-met', { factionId }); },
        leaveFaction(state) { return result(ns.Contracts.leaveFaction(state), 'not-aligned'); },
        stationFor
    };
    class ActionRouter {
        constructor() { this.handlers = new Map(); }
        register(action, handler) { if (this.handlers.has(action)) throw new Error(`Duplicate UI action: ${action}`); this.handlers.set(action, handler); return this; }
        dispatch(action, context) { const handler = this.handlers.get(action); if (!handler) return false; handler(context); return true; }
    }
    ns.Commands = Commands; ns.ActionRouter = ActionRouter;
})(window.MiniInvadersV2);
