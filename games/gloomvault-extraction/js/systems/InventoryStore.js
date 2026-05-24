const InventoryStore = {
    keys: {
        stash: 'gloomvault_stash',
        equipment: 'gloomvault_equipment',
        scraps: 'gloomvault_scraps'
    },

    getStorage() {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    },

    parseJson(value, fallback) {
        if (!value) return fallback;
        try {
            return JSON.parse(value);
        } catch (error) {
            return fallback;
        }
    },

    getEquipmentService(options = {}) {
        return options.equipmentService || (typeof EquipmentService !== 'undefined' ? EquipmentService : null);
    },

    getDurabilityConfig(options = {}) {
        return options.durabilityConfig || (typeof DurabilityConfig !== 'undefined' ? DurabilityConfig : null);
    },

    normalizeStash(stashItems, options = {}) {
        const items = Array.isArray(stashItems) ? [...stashItems] : [];
        const minSlots = Math.max(0, options.minSlots || 0);
        while (items.length < minSlots) items.push(null);
        return items;
    },

    normalizeEquipment(equipment, options = {}) {
        const equipmentService = this.getEquipmentService(options);
        const durabilityConfig = this.getDurabilityConfig(options);
        let normalized = equipment && typeof equipment === 'object' ? equipment : null;

        if (equipmentService) {
            normalized = equipmentService.ensureStarterEquipment(normalized || equipmentService.createEmptyEquipment());
            equipmentService.migrateEquipmentDurability(normalized, durabilityConfig);
            return normalized;
        }

        return normalized || {};
    },

    loadEquipment(options = {}) {
        const storage = options.storage || this.getStorage();
        const savedEquipment = storage
            ? this.parseJson(storage.getItem(this.keys.equipment), null)
            : null;
        return this.normalizeEquipment(savedEquipment, options);
    },

    load(options = {}) {
        const storage = options.storage || this.getStorage();

        if (!storage) {
            return {
                stashItems: this.normalizeStash([], { minSlots: options.minStashSlots || 0 }),
                equipment: this.normalizeEquipment(null, options),
                scraps: 0
            };
        }

        const stashItems = this.normalizeStash(
            this.parseJson(storage.getItem(this.keys.stash), []),
            { minSlots: options.minStashSlots || 0 }
        );
        const equipment = this.loadEquipment({ ...options, storage });
        const scraps = parseInt(storage.getItem(this.keys.scraps), 10) || 0;

        const equipmentService = this.getEquipmentService(options);
        if (equipmentService) {
            const durabilityConfig = this.getDurabilityConfig(options);
            for (const item of stashItems) {
                equipmentService.migrateDurability(item, durabilityConfig);
            }
        }

        return {
            stashItems,
            equipment,
            scraps
        };
    },

    save(data, options = {}) {
        const storage = options.storage || this.getStorage();
        if (!storage) return;

        storage.setItem(this.keys.stash, JSON.stringify(data.stashItems || []));
        storage.setItem(this.keys.equipment, JSON.stringify(data.equipment || {}));
        storage.setItem(this.keys.scraps, String(data.scraps || 0));
    },

    saveEquipment(equipment, options = {}) {
        const storage = options.storage || this.getStorage();
        if (!storage) return;
        storage.setItem(this.keys.equipment, JSON.stringify(equipment || {}));
    },

    clearEquipment(options = {}) {
        const storage = options.storage || this.getStorage();
        if (!storage) return;
        storage.removeItem(this.keys.equipment);
    }
};

if (typeof window !== 'undefined') {
    window.InventoryStore = InventoryStore;
}
