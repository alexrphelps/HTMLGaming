const EquipmentService = {
    slots: ['helm', 'chest', 'pants', 'boots', 'weapon', 'weapon2', 'trinket1', 'trinket2'],

    starterItems: {
        weapon: { id: 'starter_wep1', name: 'Apprentice Wand', type: 'weapon', weaponType: 'pistol', element: 'arcane', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true },
        weapon2: { id: 'starter_wep2', name: 'Splintered Staff', type: 'weapon', weaponType: 'shotgun', element: 'frost', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true },
        trinket1: { id: 'starter_tr1', name: 'Health Potion', type: 'trinket', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true, activeAbility: { type: 'heal', value: 25, cooldown: 15, name: 'Minor Heal', text: 'Use to heal 25 HP (15s CD)' } },
        trinket2: { id: 'starter_tr2', name: 'Health Potion', type: 'trinket', rarity: 'Common', color: '#a0a0a0', gearScore: 5, modifiers: [], upgradeLevel: 0, isStarter: true, activeAbility: { type: 'heal', value: 25, cooldown: 15, name: 'Minor Heal', text: 'Use to heal 25 HP (15s CD)' } }
    },

    cloneItem(item) {
        return item ? JSON.parse(JSON.stringify(item)) : null;
    },

    createEmptyEquipment() {
        return this.slots.reduce((equipment, slot) => {
            equipment[slot] = null;
            return equipment;
        }, {});
    },

    ensureStarterEquipment(equipment) {
        const nextEquipment = equipment || this.createEmptyEquipment();
        for (const slot of this.slots) {
            if (!(slot in nextEquipment)) {
                nextEquipment[slot] = null;
            }
        }

        for (const slot of ['weapon', 'weapon2', 'trinket1', 'trinket2']) {
            if (!nextEquipment[slot]) {
                nextEquipment[slot] = this.cloneItem(this.starterItems[slot]);
            }
        }
        return nextEquipment;
    },

    migrateDurability(item, durabilityConfig) {
        if (!item || item.isStarter || item.type === 'trinket' || !durabilityConfig) return item;
        if (item.durability !== undefined && item.maxDurability !== undefined) return item;

        if (durabilityConfig.calculateMaxDurability) {
            const maxDurability = durabilityConfig.calculateMaxDurability(item);
            item.maxDurability = maxDurability;
            item.durability = maxDurability;
            return item;
        }

        if (durabilityConfig.baseBySlot && durabilityConfig.baseBySlot[item.type]) {
            const baseDurability = durabilityConfig.baseBySlot[item.type];
            const rarityMultiplier = durabilityConfig.rarityMultiplier && durabilityConfig.rarityMultiplier[item.rarity]
                ? durabilityConfig.rarityMultiplier[item.rarity]
                : 1.0;
            const gearScoreBonus = Math.floor((item.gearScore || 0) * (durabilityConfig.gsScaling || 0));
            item.maxDurability = Math.max(1, Math.floor(baseDurability * rarityMultiplier) + gearScoreBonus);
            item.durability = item.maxDurability;
        }
        return item;
    },

    migrateEquipmentDurability(equipment, durabilityConfig) {
        if (!equipment) return equipment;
        for (const slot of Object.keys(equipment)) {
            this.migrateDurability(equipment[slot], durabilityConfig);
        }
        return equipment;
    },

    calculateGearScore(equipment) {
        if (!equipment) return 0;
        return Object.keys(equipment).reduce((total, slot) => {
            const item = equipment[slot];
            return total + (item && item.gearScore ? item.gearScore : 0);
        }, 0);
    }
};

if (typeof window !== 'undefined') {
    window.EquipmentService = EquipmentService;
}
