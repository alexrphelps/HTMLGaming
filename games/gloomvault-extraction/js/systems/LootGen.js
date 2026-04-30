class LootGen {
    constructor() {
        this.itemIdCounter = 0;
        
        this.rarities = [
            { name: 'Common', weight: 70, color: '#a0a0a0', mult: 1.0, minMods: 0, maxMods: 1 },
            { name: 'Epic', weight: 25, color: '#a335ee', mult: 1.5, minMods: 1, maxMods: 3 },
            { name: 'Legendary', weight: 5, color: '#ff8000', mult: 2.2, minMods: 2, maxMods: 4 }
        ];

        this.types = [
            { name: 'Helm', slot: 'helm' },
            { name: 'Chest', slot: 'chest' },
            { name: 'Pants', slot: 'pants' },
            { name: 'Boots', slot: 'boots' },
            { name: 'Weapon', slot: 'weapon' },
            { name: 'Trinket', slot: 'trinket' }
        ];

        this.modifierPool = [
            { name: 'Damage', type: 'percent', stat: 'damageMultiplier', range: [5, 15] },
            { name: 'Attack Speed', type: 'percent', stat: 'attackSpeedMultiplier', range: [5, 20] },
            { name: 'Flat Damage', type: 'flat', stat: 'flatDamage', range: [2, 10] },
            { name: 'Lifesteal', type: 'percent', stat: 'lifesteal', range: [1, 5] },
            { name: 'Movement Speed', type: 'percent', stat: 'movementSpeedMultiplier', range: [5, 15] },
            { name: 'Cooldown Reduction', type: 'percent', stat: 'cooldownReduction', range: [2, 10] }
        ];

        this.prefixes = ['Rusty', 'Iron', 'Steel', 'Gloom', 'Shadow', 'Void', 'Blood'];
        this.suffixes = ['of the Bear', 'of Swiftness', 'of the Leech', 'of Power', 'of the Void'];
        
        this.trinketAbilities = [
            { type: 'heal', value: 50, cooldown: 15, name: 'Healing Surge', text: 'Use to heal 50 HP (15s CD)' },
            { type: 'nova', damage: 40, cooldown: 8, name: 'Arcane Nova', text: 'Fires 8 projectiles around you (8s CD)' },
            { type: 'dash', speed: 800, time: 0.3, cooldown: 5, name: 'Phase Shift', text: 'A swift directional dash (5s CD)' }
        ];
    }

    rollRarity() {
        const roll = Math.random() * 100;
        let cumulative = 0;
        for (const rarity of this.rarities) {
            cumulative += rarity.weight;
            if (roll <= cumulative) return rarity;
        }
        return this.rarities[0];
    }

    rollType() {
        return this.types[Math.floor(Math.random() * this.types.length)];
    }

    generateItem(floor) {
        const rarity = this.rollRarity();
        const type = this.rollType();
        
        // Gear Score Formula: Floor * 10 to Floor * 15
        const minGS = Math.max(1, floor) * 10;
        const maxGS = Math.max(1, floor) * 15;
        const baseGS = Math.floor(Math.random() * (maxGS - minGS + 1)) + minGS;
        const gearScore = Math.floor(baseGS * rarity.mult);

        // Generate Modifiers
        const numMods = Math.floor(Math.random() * (rarity.maxMods - rarity.minMods + 1)) + rarity.minMods;
        const modifiers = [];
        const availableMods = [...this.modifierPool];

        for (let i = 0; i < numMods; i++) {
            if (availableMods.length === 0) break;
            const modIndex = Math.floor(Math.random() * availableMods.length);
            const modTemplate = availableMods.splice(modIndex, 1)[0];
            
            const modValue = Math.floor((Math.random() * (modTemplate.range[1] - modTemplate.range[0] + 1) + modTemplate.range[0]) * rarity.mult);
            
            modifiers.push({
                name: modTemplate.name,
                stat: modTemplate.stat,
                value: modValue,
                type: modTemplate.type,
                text: `+${modValue}${modTemplate.type === 'percent' ? '%' : ''} ${modTemplate.name}`
            });
        }

        // Generate Name
        const prefix = this.prefixes[Math.floor(Math.random() * this.prefixes.length)];
        let name = `${prefix} ${type.name}`;
        if (rarity.name !== 'Common') {
             const suffix = this.suffixes[Math.floor(Math.random() * this.suffixes.length)];
             name += ` ${suffix}`;
        }

        let activeAbility = null;
        if (type.slot === 'trinket') {
            activeAbility = this.trinketAbilities[Math.floor(Math.random() * this.trinketAbilities.length)];
        }

        this.itemIdCounter++;
        return {
            id: `item_${this.itemIdCounter}`,
            name: name,
            type: type.slot,
            rarity: rarity.name,
            color: rarity.color,
            gearScore: gearScore,
            modifiers: modifiers,
            upgradeLevel: 0,
            activeAbility: activeAbility
        };
    }
}
