(function (ns) {
    function serialize(state) {
        const clean = JSON.parse(JSON.stringify(state)); clean.lastSaveAt = Date.now(); return JSON.stringify(clean);
    }
    function migrate(data) {
        if (!data || typeof data !== 'object') return null;
        if (!data.schemaVersion) data.schemaVersion = 1;
        if (data.schemaVersion === 1) {
            const diamonds = Math.max(0, Math.round(Number(data.pilot?.diamonds) || 0));
            data.pilot.wallet = { banked: { aetherium: diamonds, sunshards: 0, helionite: 0 }, unbanked: { aetherium: 0, sunshards: 0, helionite: 0 } };
            delete data.pilot.diamonds;
            const slots = data.ship.slots || {};
            const shieldMap = { shield_mk1: 'shield_balanced', shield_mk2: 'shield_bulwark' };
            const mappedShield = shieldMap[slots.defense] || slots.defense || null;
            if (!slots.primary2 && slots.secondary) slots.primary2 = slots.secondary;
            delete slots.secondary; slots.defense = mappedShield;
            ['abilitySpace', 'abilityQ', 'abilityE', 'abilityShift'].forEach(slot => { if (!(slot in slots)) slots[slot] = null; });
            data.ship.ownedModules = (data.ship.ownedModules || []).map(id => shieldMap[id] || id).filter((id, index, all) => all.indexOf(id) === index);
            if (!data.ship.ownedModules.includes('afterburner')) data.ship.ownedModules.push('afterburner');
            slots.abilityShift = slots.abilityShift || 'afterburner';
            data.ship.overshield = 0; data.ship.shieldRechargeDelay = 0; delete data.ship.boost;
            data.ship.abilityCooldowns = {}; data.ship.abilityEffects = {};
            data.progression = { tutorialStep: 2, legacyCareer: true, legacyShield: Boolean(mappedShield) };
            const contracts = [data.contracts?.active, ...(data.contracts?.board || []), ...(data.contracts?.history || [])].filter(Boolean);
            contracts.forEach(contract => { if (Number.isFinite(contract.reward)) contract.reward = { aetherium: Math.round(contract.reward), sunshards: 0, helionite: 0 }; });
            data.schemaVersion = 2;
        }
        if (data.schemaVersion === 2) {
            ns.Wallet.ensure(data);
            data.progression = Object.assign({ tutorialStep: 0, legacyCareer: false, legacyShield: false }, data.progression);
            data.ship.abilityCooldowns = data.ship.abilityCooldowns || {}; data.ship.abilityEffects = data.ship.abilityEffects || {};
            ['abilitySpace', 'abilityQ', 'abilityE', 'abilityShift'].forEach(slot => { if (!(slot in data.ship.slots)) data.ship.slots[slot] = null; });
            return data;
        }
        return null;
    }
    function validate(data) {
        return Boolean(data && data.schemaVersion === 2 && data.pilot?.wallet && data.ship && data.reputations && Number.isFinite(data.ship.x) && Number.isFinite(data.ship.y));
    }
    function save(state, storage) {
        try { (storage || localStorage).setItem(ns.SAVE_KEY, serialize(state)); state.lastSaveAt = Date.now(); return true; }
        catch (error) { console.error('Frontier Wayfarer save failed:', error); return false; }
    }
    function load(storage) {
        try {
            const raw = (storage || localStorage).getItem(ns.SAVE_KEY); if (!raw) return null;
            const data = migrate(JSON.parse(raw)); return validate(data) ? data : null;
        } catch (error) { console.warn('Frontier Wayfarer ignored a corrupt save.'); return null; }
    }
    function remove(storage) { try { (storage || localStorage).removeItem(ns.SAVE_KEY); return true; } catch (_) { return false; } }
    ns.Save = { serialize, migrate, validate, save, load, remove };
})(window.MiniInvadersV2);
