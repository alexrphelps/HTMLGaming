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

        this.weaponSubTypes = [
            { id: 'pistol', names: ['Glock', 'Revolver', 'Pistol', 'Handcannon'] },
            { id: 'shotgun', names: ['Shotgun', 'Blunderbuss', 'Scattergun'] },
            { id: 'assault_rifle', names: ['Assault Rifle', 'Carbine', 'SMG'] },
            { id: 'sniper', names: ['Sniper Rifle', 'Longrifle', 'Marksman Rifle'] },
            { id: 'melee_stab', names: ['Spear', 'Pike', 'Lance', 'Rapier'] },
            { id: 'melee_cleave', names: ['Greatsword', 'Battleaxe', 'Cleaver'] }
        ];
        
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

    createModFromTemplate(template, mult = 1.0, isImplicit = false) {
        const modValue = Math.floor((Math.random() * (template.range[1] - template.range[0] + 1) + template.range[0]) * mult);
        const sign = modValue >= 0 ? '+' : '';
        const symbol = template.type.includes('percent') ? '%' : '';
        return {
            name: template.name,
            stat: template.stat,
            value: modValue,
            type: template.type,
            text: `${sign}${modValue}${symbol} ${template.name}`,
            isImplicit: isImplicit
        };
    }

    generateItem(floor) {
        const rarity = this.rollRarity();
        const type = this.rollType();
        const slotConfig = LootConfig.slots[type.slot];
        
        // Gear Score Formula: Floor * 10 to Floor * 15
        const minGS = Math.max(1, floor) * 10;
        const maxGS = Math.max(1, floor) * 15;
        const baseGS = Math.floor(Math.random() * (maxGS - minGS + 1)) + minGS;
        const gearScore = Math.floor(baseGS * rarity.mult);

        const modifiers = [];

        // 1. Calculate Base Armor if applicable
        let baseArmor = 0;
        if (slotConfig.baseArmorMultiplier > 0) {
            // Armor scales with Gear Score
            baseArmor = Math.floor(gearScore * 0.5 * slotConfig.baseArmorMultiplier);
            modifiers.push({
                name: 'Base Armor',
                stat: 'armor',
                value: baseArmor,
                type: 'flat',
                text: `+${baseArmor} Armor`,
                isImplicit: true
            });
        }

        // 2. Add slot Implicit stat if applicable
        if (slotConfig.implicit) {
            modifiers.push(this.createModFromTemplate(slotConfig.implicit, rarity.mult, true));
        }

        // 3. Roll Prefix and Suffix
        let prefix = '';
        let suffix = '';
        
        // Items always have a prefix, except maybe Common weapons/trinkets might just be "Rusty" etc.
        // We'll give it a 50% chance for prefix on Common, 100% on Epic/Legendary
        if (type.slot !== 'weapon' && type.slot !== 'trinket') {
            const rolledPrefix = LootConfig.prefixes[Math.floor(Math.random() * LootConfig.prefixes.length)];
            prefix = rolledPrefix.name;
            modifiers.push(this.createModFromTemplate(rolledPrefix.guaranteed, rarity.mult));
        } else {
            // Fallback for weapons and trinkets which don't use the armor prefix pool directly
            const basicPrefixes = ['Rusty', 'Iron', 'Steel', 'Gloom', 'Shadow', 'Void', 'Blood'];
            prefix = basicPrefixes[Math.floor(Math.random() * basicPrefixes.length)];
        }

        if (rarity.name !== 'Common' && type.slot !== 'weapon' && type.slot !== 'trinket') {
            const rolledSuffix = LootConfig.suffixes[Math.floor(Math.random() * LootConfig.suffixes.length)];
            suffix = rolledSuffix.name;
            modifiers.push(this.createModFromTemplate(rolledSuffix.guaranteed, rarity.mult));
        } else if (rarity.name !== 'Common') {
            const basicSuffixes = ['of the Bear', 'of Swiftness', 'of the Leech', 'of Power', 'of the Void'];
            suffix = basicSuffixes[Math.floor(Math.random() * basicSuffixes.length)];
        }

        // 4. Generate Random Extra Modifiers
        const numMods = Math.floor(Math.random() * (rarity.maxMods - rarity.minMods + 1)) + rarity.minMods;
        const availableMods = [...LootConfig.modifierPool];

        for (let i = 0; i < numMods; i++) {
            if (availableMods.length === 0) break;
            const modIndex = Math.floor(Math.random() * availableMods.length);
            const modTemplate = availableMods.splice(modIndex, 1)[0];
            modifiers.push(this.createModFromTemplate(modTemplate, rarity.mult));
        }

        // 5. Generate Name
        let baseName = type.name;
        let weaponType = null;
        
        if (type.slot === 'weapon') {
            const subType = this.weaponSubTypes[Math.floor(Math.random() * this.weaponSubTypes.length)];
            weaponType = subType.id;
            baseName = subType.names[Math.floor(Math.random() * subType.names.length)];
        }
        
        let name = `${prefix} ${baseName}`;
        if (suffix !== '') {
             name += ` ${suffix}`;
        }

        // 6. Assign Trinket Abilities
        let activeAbility = null;
        if (type.slot === 'trinket') {
            activeAbility = this.trinketAbilities[Math.floor(Math.random() * this.trinketAbilities.length)];
        }

        // 7. Roll Boons/Curses (Traits) for Epic and Legendary
        let passiveTrait = null;
        if (rarity.name === 'Legendary' || (rarity.name === 'Epic' && Math.random() < 0.2)) {
            passiveTrait = LootConfig.traits[Math.floor(Math.random() * LootConfig.traits.length)];
            
            // Apply trait modifiers to item
            for (const tMod of passiveTrait.modifiers) {
                const sign = tMod.value > 0 ? '+' : '';
                const symbol = tMod.type.includes('percent') ? '%' : '';
                modifiers.push({
                    name: tMod.name,
                    stat: tMod.stat,
                    value: tMod.value,
                    type: tMod.type,
                    text: `${sign}${tMod.value}${symbol} ${tMod.name}`,
                    isTrait: true
                });
            }
        }

        this.itemIdCounter++;
        return {
            id: `item_${this.itemIdCounter}`,
            name: name,
            type: type.slot,
            weaponType: weaponType,
            rarity: rarity.name,
            color: rarity.color,
            gearScore: gearScore,
            modifiers: modifiers,
            upgradeLevel: 0,
            activeAbility: activeAbility,
            passiveTrait: passiveTrait,
            baseArmor: baseArmor
        };
    }
}
