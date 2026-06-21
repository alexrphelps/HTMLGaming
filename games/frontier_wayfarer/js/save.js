(function (ns) {
    function refreshContractTargets(data) {
        const contracts = [data.contracts?.active, ...(data.contracts?.board || []), ...(data.contracts?.history || [])].filter(Boolean);
        contracts.forEach(contract => {
            const landmark = ns.Data.LANDMARKS.find(item => item.id === contract.destination);
            const hadStages = Array.isArray(contract.stages) && contract.stages.length > 0;
            if (!hadStages && landmark && contract.type !== 'escort') contract.target = { x: landmark.x, y: landmark.y };
            if (landmark && contract.type === 'escort' && !contract.escort && !['complete', 'failed'].includes(contract.status)) {
                const angle = ns.MathUtil.hash(data.worldSeed || 0, landmark.x, landmark.y, String(contract.id || '').length) * Math.PI * 2, bounds = ns.World.WORLD_BOUNDS;
                contract.escort = { phase: 'rendezvous', grace: 8, ambushes: 0, start: { x: ns.MathUtil.clamp(landmark.x + Math.cos(angle) * 1800, bounds.minX + 400, bounds.maxX - 400), y: ns.MathUtil.clamp(landmark.y + Math.sin(angle) * 1800, bounds.minY + 400, bounds.maxY - 400) }, end: { x: landmark.x, y: landmark.y }, convoy: null };
            }
            if (contract.type === 'escort' && contract.escort) {
                contract.escort.end = { x: landmark?.x ?? contract.escort.end?.x ?? contract.target.x, y: landmark?.y ?? contract.escort.end?.y ?? contract.target.y };
                const tracked = contract.escort.convoy || contract.escort.start;
                if (tracked) contract.target = { x: tracked.x, y: tracked.y };
            }
            const stages = ns.Contracts?.ensureStages ? ns.Contracts.ensureStages(contract) : contract.stages || [];
            stages.forEach(stage => {
                const destination = ns.Data.LANDMARKS.find(item => item.id === stage.destination);
                if (stage.event === 'dock' && destination) stage.target = { x: destination.x, y: destination.y };
                if (stage.search) stage.target = { x: (stage.search.revealed ? stage.search.exact : stage.search.center).x, y: (stage.search.revealed ? stage.search.exact : stage.search.center).y };
                if (stage.escort) { if (destination) stage.escort.end = { x: destination.x, y: destination.y }; const tracked = stage.escort.convoy || stage.escort.start; if (tracked) stage.target = { x: tracked.x, y: tracked.y }; }
            });
            if (ns.Contracts?.syncContract) ns.Contracts.syncContract(contract);
        });
    }
    function serialize(state) {
        const clean = JSON.parse(JSON.stringify(state)); clean.lastSaveAt = Date.now(); return JSON.stringify(clean);
    }
    function scalePoint(point, factor) {
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
        point.x *= factor; point.y *= factor;
    }
    function scaleWorldCoordinates(data, factor) {
        scalePoint(data.ship, factor);
        const contracts = [data.contracts?.active, ...(data.contracts?.board || []), ...(data.contracts?.history || [])].filter(Boolean);
        contracts.forEach(contract => {
            scalePoint(contract.target, factor);
            if (contract.escort) { scalePoint(contract.escort.start, factor); scalePoint(contract.escort.end, factor); scalePoint(contract.escort.convoy, factor); }
            (contract.stages || []).forEach(stage => {
                scalePoint(stage.target, factor);
                if (stage.search) { scalePoint(stage.search.center, factor); scalePoint(stage.search.exact, factor); }
                if (stage.escort) { scalePoint(stage.escort.start, factor); scalePoint(stage.escort.end, factor); scalePoint(stage.escort.convoy, factor); }
            });
        });
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
            data.contracts = Object.assign({ board: [], active: null, completed: 0, history: [], boardRevision: 0, lastManualRefreshAt: 0 }, data.contracts);
            data.contracts.boardRevision = Math.max(0, Math.round(Number(data.contracts.boardRevision) || 0));
            data.contracts.lastManualRefreshAt = Math.max(0, Number(data.contracts.lastManualRefreshAt) || 0);
            data.consumedEntityIds = Array.isArray(data.consumedEntityIds) ? data.consumedEntityIds.filter(id => typeof id === 'string') : [];
            data.progression = Object.assign({ tutorialStep: 0, legacyCareer: false, legacyShield: false }, data.progression);
            data.ship.abilityCooldowns = data.ship.abilityCooldowns || {}; data.ship.abilityEffects = data.ship.abilityEffects || {};
            data.ship.damageSerial = Number.isFinite(data.ship.damageSerial) ? data.ship.damageSerial : 0;
            delete data.ship.lightSpeed; refreshContractTargets(data);
            ['abilitySpace', 'abilityQ', 'abilityE', 'abilityShift'].forEach(slot => { if (!(slot in data.ship.slots)) data.ship.slots[slot] = null; });
            if (!('utility4' in data.ship.slots)) data.ship.slots.utility4 = null;
            data.marketInventories = data.marketInventories || {};
            data.schemaVersion = 3;
        }
        if (data.schemaVersion === 3) {
            ns.Wallet.ensure(data);
            data.contracts = Object.assign({ board: [], active: null, completed: 0, history: [], boardRevision: 0, lastManualRefreshAt: 0 }, data.contracts);
            data.marketInventories = data.marketInventories || {};
            data.ship.slots = data.ship.slots || {};
            if (!('utility4' in data.ship.slots)) data.ship.slots.utility4 = null;
            data.ship.abilityCooldowns = data.ship.abilityCooldowns || {}; data.ship.abilityEffects = data.ship.abilityEffects || {};
            delete data.ship.lightSpeed;
            scaleWorldCoordinates(data, 1.5);
            refreshContractTargets(data);
            data.schemaVersion = 4;
        }
        if (data.schemaVersion === 4) {
            ns.Wallet.ensure(data);
            data.contracts = Object.assign({ board: [], active: null, completed: 0, history: [], boardRevision: 0, lastManualRefreshAt: 0 }, data.contracts);
            data.marketInventories = data.marketInventories || {};
            data.ship.slots = data.ship.slots || {};
            if (!('utility4' in data.ship.slots)) data.ship.slots.utility4 = null;
            data.ship.abilityCooldowns = data.ship.abilityCooldowns || {}; data.ship.abilityEffects = data.ship.abilityEffects || {};
            delete data.ship.lightSpeed;
            refreshContractTargets(data);
            return data;
        }
        return null;
    }
    function validate(data) {
        return Boolean(data && data.schemaVersion === 4 && data.pilot?.wallet && data.ship && data.reputations && Number.isFinite(data.ship.x) && Number.isFinite(data.ship.y));
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
    ns.Save = { serialize, migrate, validate, save, load, remove, refreshContractTargets };
})(window.MiniInvadersV2);
