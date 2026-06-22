(function (ns) {
    const stores = new Map();
    const handlers = new Map();

    function bucket(kind) {
        if (!stores.has(kind)) stores.set(kind, new Map());
        return stores.get(kind);
    }
    function handlerBucket(kind) {
        if (!handlers.has(kind)) handlers.set(kind, new Map());
        return handlers.get(kind);
    }
    function register(kind, definition) {
        if (!kind || !definition || typeof definition.id !== 'string' || !definition.id.trim()) throw new Error(`Invalid ${kind || 'content'} definition`);
        const values = bucket(kind);
        if (values.has(definition.id)) throw new Error(`Duplicate ${kind} id: ${definition.id}`);
        const normalized = Object.freeze(Object.assign({ presentation: {}, eligibility: {}, handlerId: null, rendererId: null }, definition));
        values.set(normalized.id, normalized);
        return normalized;
    }
    function registerMany(kind, definitions) {
        return (Array.isArray(definitions) ? definitions : Object.values(definitions || {})).map(definition => register(kind, definition));
    }
    function registerHandler(kind, id, handler) {
        if (!id || (typeof handler !== 'function' && typeof handler !== 'object')) throw new Error(`Invalid ${kind} handler: ${id}`);
        const values = handlerBucket(kind);
        if (values.has(id)) throw new Error(`Duplicate ${kind} handler: ${id}`);
        values.set(id, handler); return handler;
    }
    function get(kind, id) { return bucket(kind).get(id) || null; }
    function all(kind) { return Array.from(bucket(kind).values()); }
    function handler(kind, id) { return handlerBucket(kind).get(id) || null; }
    function hasHandler(kind, id) { return handlerBucket(kind).has(id); }
    function validate() {
        const errors = [], regionIds = new Set(all('region').map(item => item.id)), factionIds = new Set(Object.keys(ns.Data.FACTIONS || {}));
        all('region').forEach(region => {
            if (![region.x, region.y, region.w, region.h].every(Number.isFinite) || region.w <= 0 || region.h <= 0) errors.push(`Region ${region.id} has invalid bounds`);
            if (!factionIds.has(region.faction)) errors.push(`Region ${region.id} references faction ${region.faction}`);
        });
        all('landmark').forEach(item => { if (!regionIds.has(item.region)) errors.push(`Landmark ${item.id} references region ${item.region}`); });
        all('module').forEach(module => {
            if (!get('slotCategory', module.slot)) errors.push(`Module ${module.id} uses unsupported slot category ${module.slot}`);
            if (module.ability && !module.ability.type) errors.push(`Module ${module.id} has an invalid ability`);
            Object.values(module.cost || {}).forEach(value => { if (!Number.isFinite(value) || value < 0) errors.push(`Module ${module.id} has an invalid cost`); });
        });
        stores.forEach((values, kind) => values.forEach(definition => {
            if (definition.handlerId && !hasHandler(kind, definition.handlerId)) errors.push(`${kind} ${definition.id} references handler ${definition.handlerId}`);
            if (definition.rendererId && !hasHandler('renderer', definition.rendererId)) errors.push(`${kind} ${definition.id} references renderer ${definition.rendererId}`);
        }));
        return { ok: errors.length === 0, errors };
    }

    const slotCategories = [
        { id: 'primary', label: 'Primary Weapon', group: 'mission', capacity: 2, input: ['Mouse1', 'Mouse2'] },
        { id: 'utility', label: 'Passive Utility', group: 'mission', capacity: 4 },
        { id: 'ability', label: 'Triggered Ability', group: 'mission', capacity: 4, input: ['Space', 'Q', 'E', 'Shift'] },
        { id: 'reactor', label: 'Reactor', group: 'core', capacity: 1 },
        { id: 'engine', label: 'Engine', group: 'core', capacity: 1 },
        { id: 'defense', label: 'Defense', group: 'core', capacity: 1 },
        { id: 'cargo', label: 'Cargo', group: 'core', capacity: 1 }
    ];
    registerMany('slotCategory', slotCategories);
    registerMany('slot', [
        { id: 'primary1', category: 'primary', label: 'Primary weapon 1 (Left Click)', group: 'mission' }, { id: 'primary2', category: 'primary', label: 'Primary weapon 2 (Right Click)', group: 'mission' },
        { id: 'utility1', category: 'utility', label: 'Passive Utility 1', group: 'mission' }, { id: 'utility2', category: 'utility', label: 'Passive Utility 2', group: 'mission' }, { id: 'utility3', category: 'utility', label: 'Passive Utility 3', group: 'mission' }, { id: 'utility4', category: 'utility', label: 'Passive Utility 4', group: 'mission' },
        { id: 'abilitySpace', category: 'ability', label: 'Triggered Ability 1 (Space)', group: 'mission' }, { id: 'abilityQ', category: 'ability', label: 'Triggered Ability 2 (Q)', group: 'mission' }, { id: 'abilityE', category: 'ability', label: 'Triggered Ability 3 (E)', group: 'mission' }, { id: 'abilityShift', category: 'ability', label: 'Triggered Ability 4 (Shift)', group: 'mission' },
        { id: 'reactor', category: 'reactor', label: 'Reactor', group: 'core' }, { id: 'engine', category: 'engine', label: 'Engine', group: 'core' }, { id: 'defense', category: 'defense', label: 'Defense', group: 'core' }, { id: 'cargo', category: 'cargo', label: 'Cargo', group: 'core' }
    ]);
    registerMany('region', ns.Data.REGIONS);
    registerMany('landmark', ns.Data.LANDMARKS);
    registerMany('worldObject', ns.Data.WORLD_OBJECT_TYPES);
    registerMany('worldEvent', ns.Data.WORLD_SCENARIOS);
    registerMany('contract', ns.Data.CONTRACT_TYPES);
    registerMany('module', ns.Data.MODULES);
    registerMany('hull', ns.Data.HULLS || {});
    registerMany('encounter', ns.Data.ENEMY_TYPES || {});
    registerMany('ability', Object.values(ns.Data.MODULES).filter(module => module.ability).map(module => Object.assign({}, module.ability, { id: module.id, handlerId: null, effectType: module.ability.type })));

    ns.Registry = { register, registerMany, registerHandler, get, all, handler, hasHandler, validate };
})(window.MiniInvadersV2);
