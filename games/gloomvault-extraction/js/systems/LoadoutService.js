class LoadoutService {
    constructor(options = {}) {
        this.equipmentService = options.equipmentService || (typeof EquipmentService !== 'undefined' ? EquipmentService : null);
        this.inventoryStore = options.inventoryStore || (typeof InventoryStore !== 'undefined' ? InventoryStore : null);
        this.durabilityConfig = options.durabilityConfig || (typeof DurabilityConfig !== 'undefined' ? DurabilityConfig : null);
        this.difficultyConfig = options.difficultyConfig || (typeof DifficultyConfig !== 'undefined' ? DifficultyConfig : null);
        this.slots = ['helm', 'chest', 'pants', 'boots', 'weapon', 'weapon2', 'trinket1', 'trinket2'];
    }

    createEmptyEquipment() {
        if (this.equipmentService && this.equipmentService.createEmptyEquipment) {
            return this.equipmentService.createEmptyEquipment();
        }
        return this.slots.reduce((equipment, slot) => {
            equipment[slot] = null;
            return equipment;
        }, {});
    }

    normalizeEquipment(equipment) {
        let normalized = equipment || this.createEmptyEquipment();
        if (this.equipmentService && this.equipmentService.ensureStarterEquipment) {
            normalized = this.equipmentService.ensureStarterEquipment(normalized);
        } else {
            for (const slot of this.slots) {
                if (!(slot in normalized)) normalized[slot] = null;
            }
        }

        if (this.equipmentService && this.equipmentService.migrateEquipmentDurability) {
            this.equipmentService.migrateEquipmentDurability(normalized, this.durabilityConfig);
        }
        return normalized;
    }

    loadEquipment() {
        const saved = this.inventoryStore && this.inventoryStore.loadEquipment
            ? this.inventoryStore.loadEquipment()
            : null;
        return this.normalizeEquipment(saved);
    }

    calculateGearScore(equipment) {
        if (this.equipmentService && this.equipmentService.calculateGearScore) {
            return this.equipmentService.calculateGearScore(equipment);
        }
        if (!equipment) return 0;
        return Object.keys(equipment).reduce((total, slot) => {
            const item = equipment[slot];
            return total + (item && item.gearScore ? item.gearScore : 0);
        }, 0);
    }

    preparePlayerForRun(player) {
        if (!player) return { equipment: this.createEmptyEquipment(), gearScore: 0, gearDifficultyFloor: 1 };
        const equipment = this.loadEquipment();
        player.equipment = equipment;
        if (player.recalculateStats) player.recalculateStats();
        const gearScore = this.calculateGearScore(equipment);
        const minFloor = this.difficultyConfig ? this.difficultyConfig.minStartingFloor : 1;
        const gsPerFloor = this.difficultyConfig ? this.difficultyConfig.gearScorePerFloor : 40;
        return {
            equipment,
            gearScore,
            gearDifficultyFloor: Math.max(minFloor || 1, Math.floor(gearScore / (gsPerFloor || 40)))
        };
    }

    saveEquipment(player) {
        if (!player || !player.equipment || !this.inventoryStore || !this.inventoryStore.saveEquipment) return false;
        this.inventoryStore.saveEquipment(player.equipment);
        return true;
    }

    applyDeathPenalty() {
        if (!this.inventoryStore || !this.inventoryStore.clearEquipment) return false;
        this.inventoryStore.clearEquipment();
        return true;
    }
}

if (typeof window !== 'undefined') {
    window.LoadoutService = LoadoutService;
}
